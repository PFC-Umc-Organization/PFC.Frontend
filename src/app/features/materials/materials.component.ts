import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith } from 'rxjs';

import { Cohort, Material, cohortLabel, isStaff } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CohortService } from '../../core/services/cohort.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { MaterialService } from '../../core/services/material.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { MaterialCardComponent } from './material-card/material-card.component';
import { MaterialFormComponent } from './material-form/material-form.component';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; materials: Material[] };

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

  /** Only the staff sees which cohort a material is for. */
  readonly cohorts = toSignal(
    this.staff() ? inject(CohortService).list().pipe(catchError(() => of([] as Cohort[]))) : of([] as Cohort[]),
    { initialValue: [] as Cohort[] },
  );

  readonly state = toSignal(
    this.materialService.list().pipe(
      map((materials): State => ({ kind: 'ready', materials })),
      catchError((e: Error) => of<State>({ kind: 'error', message: e.message })),
      startWith<State>({ kind: 'loading' }),
    ),
    { initialValue: { kind: 'loading' } as State },
  );
  readonly materials = computed(() => {
    const s = this.state();
    return s.kind === 'ready' ? s.materials : [];
  });
  readonly loadError = computed(() => {
    const s = this.state();
    return s.kind === 'error' ? s.message : '';
  });
  readonly actionError = signal('');

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
    const cohort = this.cohorts().find((c) => c.id === m.cursoId);
    return cohort ? cohortLabel(cohort) : 'Turma removida';
  }

  async remove(m: Material): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Remover material',
      message: `Remover "${m.titulo}"? Os grupos deixam de ver o material${m.arquivo ? ' e o arquivo é apagado' : ''}.`,
      confirmText: 'Remover',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.actionError.set('');
    this.materialService.remove(m.id).subscribe({ error: (e: Error) => this.actionError.set(e.message) });
  }

  download(m: Material): void {
    this.actionError.set('');
    this.materialService.fileLink(m.id).subscribe({
      next: ({ url }) => window.location.assign(url),
      error: (e: Error) => this.actionError.set(e.message),
    });
  }
}
