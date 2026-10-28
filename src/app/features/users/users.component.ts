import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { Cohort } from '../../core/models';
import { CohortService } from '../../core/services/cohort.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AccountFormComponent } from './account-form/account-form.component';
import { EnrollFormComponent } from './enroll-form/enroll-form.component';
import { EnrollmentListComponent } from './enrollment-list/enrollment-list.component';
import { UserListComponent } from './user-list/user-list.component';

type Section = 'accounts' | 'enrollments';

@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AccountFormComponent, EnrollFormComponent, EnrollmentListComponent, UserListComponent],
  templateUrl: './users.component.html',
})
/** Each tab is a list; its form opens above it on demand. */
export class UsersComponent {
  readonly sections: { id: Section; label: string }[] = [
    { id: 'accounts', label: 'Contas' },
    { id: 'enrollments', label: 'Pré-autorização de alunos' },
  ];
  readonly section = signal<Section>('accounts');
  readonly formOpen = signal(false);
  /** What the last form did, shown above the list. */
  readonly done = signal('');
  /** Bumped to remount the list, so it reads again what the form changed. */
  readonly version = signal(0);

  constructor() {
    effect(() => {
      this.section();
      untracked(() => {
        this.formOpen.set(false);
        this.done.set('');
      });
    });
  }

  open(): void {
    this.done.set('');
    this.formOpen.set(true);
  }

  finish(message: string): void {
    this.formOpen.set(false);
    this.done.set(message);
    this.version.update((v) => v + 1);
  }

  /** Undefined while loading: the list would otherwise say there is no cohort. */
  readonly cohorts = toSignal(inject(CohortService).list().pipe(catchError(() => of([] as Cohort[]))), {
    initialValue: undefined,
  });
  /** The cohort the list shows; the form starts on it and the list follows the form. */
  readonly enrollmentCohort = signal('');
}
