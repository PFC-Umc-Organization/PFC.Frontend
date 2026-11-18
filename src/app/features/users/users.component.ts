import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal, viewChild } from '@angular/core';

import { Cohort } from '../../core/models';
import { CohortService } from '../../core/services/cohort.service';
import { loadable } from '../../core/state/loadable';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AccountFormComponent } from './account-form/account-form.component';
import { EnrollFormComponent } from './enroll-form/enroll-form.component';
import { EnrollmentListComponent } from './enrollment-list/enrollment-list.component';
import { UserListComponent } from './user-list/user-list.component';

// Tipo
type Section = 'accounts' | 'enrollments';

// Componente
@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AccountFormComponent, EnrollFormComponent, EnrollmentListComponent, UserListComponent],
  templateUrl: './users.component.html',
})
export class UsersComponent {
  readonly sections: { id: Section; label: string }[] = [
    { id: 'accounts', label: 'Contas' },
    { id: 'enrollments', label: 'Pré-autorização de alunos' },
  ];
  readonly section = signal<Section>('accounts');
  readonly formOpen = linkedSignal({ source: this.section, computation: () => false });
  readonly done = linkedSignal({ source: this.section, computation: () => '' });
  private readonly userList = viewChild(UserListComponent);
  private readonly enrollmentList = viewChild(EnrollmentListComponent);

  // Abertura
  open(): void {
    this.done.set('');
    this.formOpen.set(true);
  }

  // Conclusão
  finish(message: string): void {
    this.formOpen.set(false);
    this.done.set(message);
    this.userList()?.reload();
    this.enrollmentList()?.reload();
  }

  private readonly cohortService = inject(CohortService);
  readonly cohorts = loadable({ source: () => this.cohortService.list(), initial: [] as Cohort[] });

  readonly enrollmentCohort = signal('');
}
