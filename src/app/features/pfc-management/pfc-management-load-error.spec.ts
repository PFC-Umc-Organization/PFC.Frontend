import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Cohort, Program, Project, ProjectPenalties, User } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CohortService } from '../../core/services/cohort.service';
import { CourseService } from '../../core/services/course.service';
import { PenaltyService } from '../../core/services/penalty.service';
import { ProgramService } from '../../core/services/program.service';
import { ProjectService } from '../../core/services/project.service';
import { UserService } from '../../core/services/user.service';
import { CohortsComponent } from '../cohorts/cohorts.component';

const cohort = { id: 't1', nome: 'Engenharia de Software', turno: 'NOITE', periodo: '2026.2' } as Cohort;
const program: Program = { id: 'p1', cursoId: 't1' };
const project: Project = { id: 'pr1', nome: 'Athena', descricao: '', programaId: 'p1', integrantes: ['111'] };
const failure = <T>(): Observable<T> => throwError(() => new Error('serviço fora do ar'));

interface Answers {
  cohorts?: () => Observable<Cohort[]>;
  programs?: () => Observable<Program[]>;
  projects?: (programId?: string) => Observable<Project[]>;
  users?: () => Observable<User[]>;
  penalties?: () => Observable<ProjectPenalties[]>;
  role?: 'ADMIN' | 'ORIENTADOR';
}

/** Fails on the first call and answers normally on the retry. */
function failingOnce<T>(value: T): () => Observable<T> {
  let calls = 0;
  return () => (++calls === 1 ? failure<T>() : of(value));
}

async function render(answers: Answers = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: { role: signal(answers.role ?? 'ADMIN') } },
      { provide: CohortService, useValue: { list: answers.cohorts ?? (() => of([cohort])) } },
      { provide: CourseService, useValue: { list: () => of([]) } },
      { provide: ProgramService, useValue: { list: answers.programs ?? (() => of([program])) } },
      { provide: ProjectService, useValue: { list: answers.projects ?? (() => of([project])) } },
      { provide: UserService, useValue: { list: answers.users ?? (() => of([])) } },
      { provide: PenaltyService, useValue: { ofProgram: answers.penalties ?? (() => of([])) } },
    ],
  });
  const fixture = TestBed.createComponent(CohortsComponent);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes(label))!;
  const click = async (label: string) => {
    button(label).click();
    await fixture.whenStable();
  };
  await click('PFCs dos alunos');
  return { host, button, click };
}

describe('PFC management load errors (Turmas e PFC)', () => {
  beforeAll(() => {
    // The table's scroll hint needs it; the test environment has no layout.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  it('shows no error when everything loads', async () => {
    const { host } = await render();
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Athena');
  });

  it('survives failed cohorts, does not claim a missing program, and recovers on retry', async () => {
    const { host, click } = await render({ cohorts: failingOnce([cohort]) });
    expect(host.textContent).toContain('Não foi possível carregar as turmas e os programas de PFC. serviço fora do ar');
    expect(host.textContent).not.toContain('ainda não tem programa');

    await click('Tentar novamente');
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Athena');
  });

  it('does not claim a missing program when programs failed to load', async () => {
    const { host } = await render({ programs: failure });
    expect(host.textContent).toContain('Não foi possível carregar as turmas e os programas de PFC');
    expect(host.textContent).not.toContain('ainda não tem programa');
  });

  it('does not claim there are no cohorts on the programs tab when loading failed', async () => {
    const { host, click } = await render({ cohorts: failure });
    await click('Programas de PFC');
    expect(host.textContent).not.toContain('Nenhuma turma cadastrada');
    expect(host.textContent).toContain('Os programas aparecem aqui depois que as turmas forem carregadas');
  });

  it('warns when user names failed to load and recovers on retry', async () => {
    const { host, click } = await render({ users: failingOnce([] as User[]) });
    expect(host.textContent).toContain('Não foi possível carregar os nomes de integrantes e orientadores');

    await click('Tentar novamente');
    expect(host.querySelector('.alert')).toBeNull();
  });

  describe('project status', () => {
    const penalties = (ativas: number, reprovado: boolean): ProjectPenalties => ({
      projetoId: 'pr1',
      ativas,
      limite: 3,
      reprovado,
      penalidades: [],
    });
    const statusCell = (host: HTMLElement) => {
      const headers = Array.from(host.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
      return host.querySelectorAll('tbody td')[headers.indexOf('Status')].textContent?.replace(/\s+/g, ' ').trim();
    };

    it('shows a group below the limit as in progress, without counting zero penalties', async () => {
      const { host } = await render({ penalties: () => of([penalties(0, false)]) });
      expect(statusCell(host)).toBe('Em andamento');
    });

    it('shows how many penalties a group in progress has', async () => {
      const { host } = await render({ penalties: () => of([penalties(2, false)]) });
      expect(statusCell(host)).toBe('Em andamento · 2 de 3 penalidades');
    });

    it('shows a group at the limit as failed', async () => {
      const { host } = await render({ penalties: () => of([penalties(3, true)]) });
      expect(statusCell(host)).toBe('Reprovado');
    });

    it('also shows the status to an advisor, whose table has no advisor column', async () => {
      const { host } = await render({ role: 'ORIENTADOR', penalties: () => of([penalties(3, true)]) });
      expect(statusCell(host)).toBe('Reprovado');
    });

    it('does not guess a status when loading failed, and recovers on retry', async () => {
      const { host, click } = await render({ penalties: failingOnce([penalties(3, true)]) });
      expect(host.textContent).toContain('Não foi possível carregar o status dos PFCs. serviço fora do ar');
      expect(statusCell(host)).toBe('—');

      await click('Tentar novamente');
      expect(host.querySelector('.alert')).toBeNull();
      expect(statusCell(host)).toBe('Reprovado');
    });
  });

  it('keeps move and remove locked when the project count is unknown, until a retry works', async () => {
    // Only the count asks for every project; the default tab asks for one program.
    const allProjects = failingOnce([] as Project[]);
    const { host, click } = await render({
      projects: (programId) => (programId ? of([project]) : allProjects()),
    });
    await click('Programas de PFC');
    expect(host.textContent).toContain('Não foi possível contar os PFCs');
    const remove = () => host.querySelector<HTMLButtonElement>('button[aria-label^="Excluir programa"]')!;
    expect(remove().disabled).toBe(true);

    await click('Tentar novamente');
    expect(host.querySelector('.alert')).toBeNull();
    expect(remove().disabled).toBe(false);
  });
});
