import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Cohort, Material, cohortLabel, isStaff } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CohortService } from '../../core/services/cohort.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { MaterialService } from '../../core/services/material.service';
import { action } from '../../core/state/action';
import { loadable } from '../../core/state/loadable';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { MaterialCardComponent } from './material-card/material-card.component';
import { MaterialFormComponent } from './material-form/material-form.component';

/** The staff publishes (link or file); everyone reads. */
@Component({
  selector: 'app-materials',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, MaterialFormComponent, MaterialCardComponent],
  templateUrl: './materials.component.html',
  styleUrl: './materials.component.scss',
})
export class MaterialsComponent {
  private readonly auth = inject(AuthService);
  private readonly materialService = inject(MaterialService);
  private readonly confirmation = inject(ConfirmationService);

  readonly staff = computed(() => isStaff(this.auth.role()));

  private readonly cohortService = inject(CohortService);
  /** Only the staff sees which cohort a material is for. */
  readonly cohorts = loadable({
    source: () => this.cohortService.list(),
    params: computed(() => (this.staff() ? true : null)),
    initial: [] as Cohort[],
  });

  readonly list = loadable({ source: () => this.materialService.list(), initial: [] as Material[] });
  readonly materials = this.list.value;
  readonly loadError = this.list.error;
  private readonly removeAction = action((id: string) => this.materialService.remove(id), { concurrency: 'merge' });
  private readonly downloadAction = action((id: string) => this.materialService.fileLink(id), {
    onSuccess: ({ url }) => window.location.assign(url),
    concurrency: 'merge',
  });
  readonly actionError = computed(() => this.removeAction.error() || this.downloadAction.error());
  readonly formOpen = signal(false);
  readonly done = signal('');

  open(): void {
    this.done.set('');
    this.formOpen.set(true);
  }

  published(): void {
    this.formOpen.set(false);
    this.done.set('Material publicado e disponível para os grupos.');
  }

  /** The coordination removes any material; an advisor, their own. */
  canRemove(m: Material): boolean {
    const u = this.auth.user();
    return u?.perfil === 'ADMIN' || (u?.perfil === 'ORIENTADOR' && m.autorId === u.id);
  }

  audience(m: Material): string {
    if (!m.cursoId) {
      return 'Todas as turmas';
    }
    if (!this.staff()) {
      return 'Para a sua turma';
    }
    const cohort = this.cohorts.value().find((c) => c.id === m.cursoId);
    if (cohort) {
      return cohortLabel(cohort);
    }
    return this.cohorts.error() ? 'Turma não identificada' : 'Turma removida';
  }

  async remove(m: Material): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Remover material',
      message: `Remover "${m.titulo}"? O material deixará de ser exibido aos grupos${m.arquivo ? ' e o arquivo será apagado' : ''}.`,
      confirmText: 'Remover',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.removeAction.run(m.id);
  }

  download(m: Material): void {
    this.downloadAction.run(m.id);
  }
}
