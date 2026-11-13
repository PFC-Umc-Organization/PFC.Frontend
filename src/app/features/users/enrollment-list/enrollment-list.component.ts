import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';

import { Cohort, Enrollment, User, cohortLabel, currentTerm, isInTerm } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { UserService } from '../../../core/services/user.service';
import { action } from '../../../core/state/action';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

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
  /** Empty until chosen: then the first cohort of this term, or the first one. */
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
  private readonly removeFailure = signal('');
  readonly error = computed(() => this.removeFailure() || this.removeAction.error());
  readonly canAdd = input(true);
  readonly add = output();
  protected readonly cohortLabel = cohortLabel;

  readonly shownCohortId = computed(() => {
    const cohorts = this.cohorts();
    const term = currentTerm();
    return this.cohortId() || (cohorts.find((c) => isInTerm(c, term)) ?? cohorts[0])?.id || '';
  });

  /** Empty while loading or after a failure: check `loading` and `error` before saying there is no one. */
  readonly enrollments = loadable({
    source: (id: string) => this.enrollmentService.list(id),
    params: computed(() => this.shownCohortId() || null),
    initial: [] as Enrollment[],
  });

  choose(event: Event): void {
    this.removeFailure.set('');
    this.cohortId.set((event.target as HTMLSelectElement).value);
  }

  /** The status column never guesses "Aguardando cadastro": it waits for `users` or shows the error. */
  private readonly userService = inject(UserService);
  readonly users = loadable({ source: () => this.userService.list(), initial: [] as User[] });

  /** Reads the list again after a form changed it. */
  reload(): void {
    this.enrollments.reload();
    this.users.reload();
  }

  /** The account of the student whose e-mail is `<rgm>@…`. */
  accountOf(rgm: string): User | undefined {
    return this.users.value().find((u) => u.rgm === rgm);
  }

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
