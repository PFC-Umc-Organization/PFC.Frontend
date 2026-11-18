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
// Falha
const failure = <T>(): Observable<T> => throwError(() => new Error('serviço fora do ar'));

// Tipo
interface Answers {
  cohorts?: () => Observable<Cohort[]>;
  programs?: () => Observable<Program[]>;
  projects?: (programId?: string) => Observable<Project[]>;
  users?: () => Observable<User[]>;
  penalties?: () => Observable<ProjectPenalties[]>;
  role?: 'ADMIN' | 'ORIENTADOR';
}

// Falha parcial
function failingOnce<T>(value: T): () => Observable<T> {
  let calls = 0;
  return () => (++calls === 1 ? failure<T>() : of(value));
}

// Renderização
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
  return { host, button, click };
}

describe('PFC management load errors (Turmas e PFC)', () => {
  beforeAll(() => {
    // Stub do ResizeObserver
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  it('shows no error when everything loads', async () => {
    const { host } = await render();
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Engenharia de Software');
  });

  it('survives failed cohorts, does not claim a missing program, and recovers on retry', async () => {
    const { host, click } = await render({ cohorts: failingOnce([cohort]) });
    expect(host.textContent).toContain('Não foi possível carregar as turmas e os programas de PFC. serviço fora do ar');
    expect(host.textContent).not.toContain('ainda não tem programa');

    await click('Tentar novamente');
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Engenharia de Software');
  });

  it('does not claim a missing program when programs failed to load', async () => {
    const { host } = await render({ programs: failure });
    expect(host.textContent).toContain('Não foi possível carregar as turmas e os programas de PFC');
    expect(host.textContent).not.toContain('ainda não tem programa');
  });

  it('does not offer to create a program when programs failed to load', async () => {
    const { host, click } = await render({ programs: failure });
    await click('Cursos e turmas');
    expect(host.textContent).not.toContain('Criar programa');
    expect(host.textContent).toContain('Engenharia de Software');
  });

  it('keeps move and remove locked when the project count is unknown, until a retry works', async () => {
    let reads = 0;
    const allProjects = () => (++reads <= 2 ? failure<Project[]>() : of([] as Project[]));
    const { host, click } = await render({
      projects: (programId) => (programId ? of([project]) : allProjects()),
    });
    await click('Cursos e turmas');
    expect(host.textContent).toContain('Não foi possível contar os PFCs');
    const remove = () => host.querySelector<HTMLButtonElement>('button[aria-label^="Excluir programa"]')!;
    expect(remove().disabled).toBe(true);

    await click('Tentar novamente');
    expect(host.querySelector('.alert')).toBeNull();
    expect(remove().disabled).toBe(false);
  });
});
