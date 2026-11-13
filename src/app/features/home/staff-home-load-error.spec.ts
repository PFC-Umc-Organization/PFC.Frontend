import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Cohort } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CohortService } from '../../core/services/cohort.service';
import { PenaltyService } from '../../core/services/penalty.service';
import { ProgramService } from '../../core/services/program.service';
import { ProjectService } from '../../core/services/project.service';
import { SubmissionService } from '../../core/services/submission.service';
import { UserService } from '../../core/services/user.service';
import { StaffHomeComponent } from './staff-home/staff-home.component';

const cohort = { id: 't1', nome: 'Engenharia de Software', turno: 'NOITE', periodo: '2026.2' } as Cohort;
const failure = <T>(): Observable<T> => throwError(() => new Error('serviço fora do ar'));

function configure(cohorts: () => Observable<Cohort[]>, programs: () => Observable<unknown[]> = () => of([])) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: { role: signal('ADMIN'), user: signal({ id: 'me', perfil: 'ADMIN' }) } },
      { provide: CohortService, useValue: { list: cohorts } },
      { provide: ProgramService, useValue: { list: programs } },
      { provide: ProjectService, useValue: { list: () => of([]) } },
      { provide: UserService, useValue: { list: () => of([]) } },
      { provide: PenaltyService, useValue: { ofProgram: () => of([]) } },
      { provide: SubmissionService, useValue: { statusGrid: () => of({ activities: [], rows: [], submissions: [] }) } },
    ],
  });
}

describe('StaffHomeComponent load errors', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  it('shows the error instead of throwing when the cohorts fail, and recovers on retry', async () => {
    let calls = 0;
    configure(() => (++calls === 1 ? failure<Cohort[]>() : of([cohort])));
    const fixture = TestBed.createComponent(StaffHomeComponent);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Não foi possível carregar as turmas. serviço fora do ar');

    Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('Tentar novamente'))!.click();
    await fixture.whenStable();
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Engenharia de Software');
  });

  it('does not hide a failed programs read behind "no projects"', async () => {
    configure(() => of([cohort]), () => failure<unknown[]>());
    const fixture = TestBed.createComponent(StaffHomeComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Não foi possível carregar os programas de PFC.');
  });
});
