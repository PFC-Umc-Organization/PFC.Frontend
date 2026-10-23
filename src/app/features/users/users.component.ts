import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { Cohort } from '../../core/models';
import { CohortService } from '../../core/services/cohort.service';
import { AccountFormComponent } from './account-form/account-form.component';
import { EnrollFormComponent } from './enroll-form/enroll-form.component';
import { EnrollmentListComponent } from './enrollment-list/enrollment-list.component';
import { UserListComponent } from './user-list/user-list.component';

type Section = 'account' | 'enroll' | 'enrollments' | 'users';

@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountFormComponent, EnrollFormComponent, EnrollmentListComponent, UserListComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent {
  readonly sections: { id: Section; label: string }[] = [
    { id: 'account', label: 'Cadastrar orientador ou admin' },
    { id: 'enroll', label: 'Pré-autorizar alunos' },
    { id: 'enrollments', label: 'RGMs pré-autorizados' },
    { id: 'users', label: 'Usuários' },
  ];
  readonly section = signal<Section>('account');

  readonly cohorts = toSignal(inject(CohortService).list().pipe(catchError(() => of([] as Cohort[]))), {
    initialValue: [] as Cohort[],
  });
}
