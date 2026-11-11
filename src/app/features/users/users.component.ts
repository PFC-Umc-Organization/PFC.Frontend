import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal, viewChild } from '@angular/core';

import { Cohort } from '../../core/models';
import { CohortService } from '../../core/services/cohort.service';
import { loadable } from '../../core/state/loadable';
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
  /** Switching tabs closes the form and clears the previous action's message. */
  readonly formOpen = linkedSignal({ source: this.section, computation: () => false });
  /** What the last form did, shown above the list. */
  readonly done = linkedSignal({ source: this.section, computation: () => '' });
  private readonly userList = viewChild(UserListComponent);
  private readonly enrollmentList = viewChild(EnrollmentListComponent);

  open(): void {
    this.done.set('');
    this.formOpen.set(true);
  }

  finish(message: string): void {
    this.formOpen.set(false);
    this.done.set(message);
    // The list reads again what the form changed.
    this.userList()?.reload();
    this.enrollmentList()?.reload();
  }

  /** `value` is empty while loading or after a failure: check `loading` and `error` before saying there is no cohort. */
  private readonly cohortService = inject(CohortService);
  readonly cohorts = loadable({ source: () => this.cohortService.list(), initial: [] as Cohort[] });

  /** The cohort the list shows; the form starts on it and the list follows the form. */
  readonly enrollmentCohort = signal('');
}
