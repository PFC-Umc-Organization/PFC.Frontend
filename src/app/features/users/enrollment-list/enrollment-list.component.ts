import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, combineLatest, of, startWith, switchMap } from 'rxjs';

import { Cohort, Enrollment, User, cohortLabel, currentTerm, isInTerm } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { UserService } from '../../../core/services/user.service';
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
  readonly error = signal('');
  readonly canAdd = input(true);
  readonly add = output();
  protected readonly cohortLabel = cohortLabel;

  readonly shownCohortId = computed(() => {
    const cohorts = this.cohorts();
    const term = currentTerm();
    return this.cohortId() || (cohorts.find((c) => isInTerm(c, term)) ?? cohorts[0])?.id || '';
  });

  private readonly reload$ = new Subject<void>();
  /** Undefined while loading, so the count and the empty row wait. */
  readonly enrollments = toSignal(
    combineLatest([toObservable(this.shownCohortId), this.reload$.pipe(startWith(undefined))]).pipe(
      switchMap(([id]) =>
        id
          ? this.enrollmentService.list(id).pipe(
              startWith(undefined),
              catchError((e: Error) => {
                this.error.set(e.message);
                return of([] as Enrollment[]);
              }),
            )
          : EMPTY,
      ),
    ),
    { initialValue: undefined },
  );

  choose(event: Event): void {
    this.error.set('');
    this.cohortId.set((event.target as HTMLSelectElement).value);
  }

  /** Undefined while loading: the status column waits instead of saying "Aguardando cadastro". */
  readonly users = toSignal(inject(UserService).list().pipe(catchError(() => of([] as User[]))), {
    initialValue: undefined,
  });

  /** The account of the student whose e-mail is `<rgm>@…`. */
  accountOf(rgm: string): User | undefined {
    return this.users()?.find((u) => u.rgm === rgm);
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
    this.error.set('');
    this.enrollmentService.remove([rgm]).subscribe({
      next: () => this.reload$.next(),
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
