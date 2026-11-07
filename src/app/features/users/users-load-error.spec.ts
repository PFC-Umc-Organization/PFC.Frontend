import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Cohort, Enrollment, User } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CohortService } from '../../core/services/cohort.service';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { UserService } from '../../core/services/user.service';
import { UsersComponent } from './users.component';

const cohort = { id: 't1', nome: 'Engenharia de Software', turno: 'NOITE', periodo: '2026.2' } as Cohort;
const enrollment = { rgm: '111', status: 'ATIVO', turmaId: 't1' } as Enrollment;
const account = { id: 'u1', nome: 'Ana', perfil: 'ALUNO', rgm: '111', email: '111@alunos.umc.br', status: 'ATIVO' } as User;
const failure = <T>(): Observable<T> => throwError(() => new Error('serviço fora do ar'));

/** Fails on the first `times` calls and answers normally afterwards. */
function failing<T>(value: T, times = 1): () => Observable<T> {
  let calls = 0;
  return () => (++calls <= times ? failure<T>() : of(value));
}

interface Answers {
  cohorts?: () => Observable<Cohort[]>;
  enrollments?: () => Observable<Enrollment[]>;
  users?: () => Observable<User[]>;
}

async function render(answers: Answers = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: { user: signal({ id: 'me' }) } },
      { provide: CohortService, useValue: { list: answers.cohorts ?? (() => of([cohort])) } },
      { provide: EnrollmentService, useValue: { list: answers.enrollments ?? (() => of([enrollment])) } },
      { provide: UserService, useValue: { list: answers.users ?? (() => of([account])) } },
    ],
  });
  const fixture = TestBed.createComponent(UsersComponent);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const click = async (label: string) => {
    Array.from(host.querySelectorAll('button'))
      .find((b) => b.textContent?.includes(label))!
      .click();
    await fixture.whenStable();
  };
  return { host, click };
}

describe('UsersComponent load errors', () => {
  beforeAll(() => {
    // The table's scroll hint needs it; the test environment has no layout.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  it('accounts: shows no zeros or empty-filter text when loading failed, and recovers on retry', async () => {
    const { host, click } = await render({ users: failing([account], 2) });
    expect(host.textContent).toContain('serviço fora do ar');
    expect(host.textContent).toContain('As contas não foram carregadas.');
    expect(host.textContent).not.toContain('Nenhuma conta encontrada');
    expect(host.textContent).not.toContain('0 contas');

    await click('Tentar novamente');
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Ana');
    expect(host.textContent).toContain('1 conta');
  });

  it('accounts: still reports an empty result when nothing failed', async () => {
    const { host } = await render({ users: () => of([]) });
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Nenhuma conta encontrada com esses filtros.');
  });

  it('enrollments: does not ask to register a cohort when cohorts failed, and recovers on retry', async () => {
    const { host, click } = await render({ cohorts: failing([cohort]) });
    await click('Pré-autorização de alunos');
    expect(host.textContent).toContain('Não foi possível carregar as turmas. serviço fora do ar');
    expect(host.textContent).not.toContain('Cadastre uma turma');

    await click('Tentar novamente');
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('111');
  });

  it('enrollments: does not claim an account is missing when users failed, and recovers on retry', async () => {
    // The accounts tab reads the users first, so only the enrollments tab's call fails.
    const { host, click } = await render({ users: failing([account], 0) });
    TestBed.inject(UserService).list = failing([account]);
    await click('Pré-autorização de alunos');
    expect(host.textContent).toContain('Não foi possível verificar quais RGMs já têm conta');
    expect(host.textContent).toContain('Não verificado');
    expect(host.textContent).not.toContain('Aguardando cadastro');

    await click('Tentar novamente');
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Conta criada');
    expect(host.textContent).toContain('Ana');
  });

  it('enrollments: does not claim a cohort has no RGMs when loading failed', async () => {
    const { host, click } = await render({ enrollments: failure });
    await click('Pré-autorização de alunos');
    expect(host.textContent).toContain('serviço fora do ar');
    expect(host.textContent).toContain('Os RGMs desta turma não foram carregados.');
    expect(host.textContent).not.toContain('Nenhum RGM pré-autorizado');
    expect(host.textContent).not.toContain('0 RGMs');
  });
});
