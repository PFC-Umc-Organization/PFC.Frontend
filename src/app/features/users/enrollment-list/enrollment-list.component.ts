import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, startWith, switchMap } from 'rxjs';

import { Cohort, Enrollment, User, cohortLabel } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { UserService } from '../../../core/services/user.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-enrollment-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './enrollment-list.component.html',
  styles: '.alert { margin: 1rem 1.25rem 0; }',
})
export class EnrollmentListComponent {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly confirmation = inject(ConfirmationService);

  readonly cohorts = input.required<Cohort[]>();
  readonly error = signal('');

  private readonly reload$ = new Subject<void>();
  readonly enrollments = toSignal(
    this.reload$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.enrollmentService.list().pipe(
          catchError((e: Error) => {
            this.error.set(e.message);
            return of([] as Enrollment[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as Enrollment[] },
  );

  private readonly users = toSignal(inject(UserService).list().pipe(catchError(() => of([] as User[]))), {
    initialValue: [] as User[],
  });

  /** The account of the student whose e-mail is `<rgm>@…`. */
  accountOf(rgm: string): User | undefined {
    return this.users().find((u) => u.rgm === rgm);
  }

  cohortName(id?: string): string {
    const cohort = this.cohorts().find((c) => c.id === id);
    return cohort ? cohortLabel(cohort) : '—';
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
