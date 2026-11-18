import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';

import { Cohort, Enrollment, User, cohortLabel, currentTerm, isInTerm } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { UserService } from '../../../core/services/user.service';
import { action } from '../../../core/state/action';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

// Componente
@Component({
  selector: 'app-enrollment-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ScrollHintDirective],
  templateUrl: './enrollment-list.component.html',
  styles: '.picker { min-width: 14rem; }',
})
export class EnrollmentListComponent {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly confirmation = inject(ConfirmationService);

  readonly cohorts = input.required<Cohort[]>();
  readonly cohortId = model('');
  private readonly removeAction = action((rgm: string) => this.enrollmentService.remove([rgm]), {
    onSuccess: (result) => {
      const failure = result.falhas?.[0];
      if (failure) {
        this.removeFailure.set(`Não foi possível remover o RGM ${failure.rgm}. ${failure.erro}`);
      }
      this.enrollments.reload();
    },
    concurrency: 'merge',
  });
  readonly removing = this.removeAction.pending;
  private readonly moveAction = action((rgm: string, cohortId: string) => this.enrollmentService.enroll([rgm], cohortId), {
    onSuccess: (result, rgm) => {
      const failure = result.falhas?.[0];
      this.moveFailure.set(failure ? `Não foi possível mudar a turma do RGM ${rgm}. ${failure.erro}` : '');
      this.moved.set(failure ? '' : `Turma do RGM ${rgm} alterada.`);
      this.enrollments.reload();
    },
    onError: () => this.enrollments.reload(),
  });
  readonly moving = this.moveAction.pending;
  private readonly moveFailure = signal('');
  readonly moved = signal('');
  private readonly removeFailure = signal('');
  readonly error = computed(() => this.removeFailure() || this.removeAction.error() || this.moveFailure() || this.moveAction.error());
  readonly canAdd = input(true);
  readonly add = output();
  protected readonly cohortLabel = cohortLabel;

  readonly shownCohortId = computed(() => {
    const cohorts = this.cohorts();
    const term = currentTerm();
    return this.cohortId() || (cohorts.find((c) => isInTerm(c, term)) ?? cohorts[0])?.id || '';
  });

  readonly enrollments = loadable({
    source: (id: string) => this.enrollmentService.list(id),
    params: computed(() => this.shownCohortId() || null),
    initial: [] as Enrollment[],
  });

  // Seleção
  choose(event: Event): void {
    this.removeFailure.set('');
    this.moveFailure.set('');
    this.moved.set('');
    this.cohortId.set((event.target as HTMLSelectElement).value);
  }

  private readonly userService = inject(UserService);
  readonly users = loadable({ source: () => this.userService.list(), initial: [] as User[] });

  // Recarga
  reload(): void {
    this.enrollments.reload();
    this.users.reload();
  }

  // Conta
  accountOf(rgm: string): User | undefined {
    return this.users.value().find((u) => u.rgm === rgm);
  }

  // ---------------------------------------------------------------------------
  // Turma
  // ---------------------------------------------------------------------------

  // Mudança
  async move(rgm: string, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const target = this.cohorts().find((c) => c.id === select.value);
    const current = this.cohorts().find((c) => c.id === this.shownCohortId());
    if (!target || target.id === current?.id) {
      return;
    }
    const confirmed = await this.confirmation.confirm({
      title: 'Mudar de turma',
      message: `Mudar o RGM ${rgm} de ${current ? cohortLabel(current) : 'turma atual'} para ${cohortLabel(target)}? O aluno passa a seguir o programa de PFC da nova turma.`,
      confirmText: 'Mudar turma',
    });
    if (!confirmed) {
      select.value = this.shownCohortId();
      return;
    }
    this.removeFailure.set('');
    this.moveFailure.set('');
    this.moved.set('');
    this.moveAction.run(rgm, target.id);
  }

  // ---------------------------------------------------------------------------
  // Exclusão
  // ---------------------------------------------------------------------------

  // Remoção
  async remove(rgm: string): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Remover pré-autorização',
      message: `Remover a pré-autorização do RGM ${rgm}? A pessoa deixa de poder se cadastrar com esse RGM.`,
      confirmText: 'Remover',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.removeFailure.set('');
    this.removeAction.run(rgm);
  }
}
