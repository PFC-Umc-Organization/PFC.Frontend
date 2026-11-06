import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Cohort, Program, Project, ProjectPenalties, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CohortService } from '../../../core/services/cohort.service';
import { CourseService } from '../../../core/services/course.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProgramService } from '../../../core/services/program.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { CohortsComponent } from '../../cohorts/cohorts.component';

const cohort = { id: 't1', nome: 'Engenharia de Software', turno: 'NOITE', periodo: '2026.2' } as Cohort;
const program: Program = { id: 'p1', cursoId: 't1' };
const athena: Project = { id: 'a', nome: 'Athena', descricao: '', programaId: 'p1', integrantes: ['111'], orientadorId: 'prof' };
const hermes: Project = { id: 'h', nome: 'Hermes', descricao: '', programaId: 'p1', integrantes: ['222'] };
const users = [
  { id: 's1', nome: 'João Lima', rgm: '111', perfil: 'ALUNO' },
  { id: 's2', nome: 'Maria Souza', rgm: '222', perfil: 'ALUNO' },
  { id: 'prof', nome: 'Prof. Carlos', perfil: 'ORIENTADOR' },
] as User[];
const penalties: ProjectPenalties[] = [
  { projetoId: 'a', ativas: 0, limite: 3, reprovado: false, penalidades: [] },
  { projetoId: 'h', ativas: 3, limite: 3, reprovado: true, penalidades: [] },
];

async function render(role: 'ADMIN' | 'ORIENTADOR', ofProgram: () => Observable<ProjectPenalties[]> = () => of(penalties)) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: { role: signal(role) } },
      { provide: CohortService, useValue: { list: () => of([cohort]) } },
      { provide: CourseService, useValue: { list: () => of([]) } },
      { provide: ProgramService, useValue: { list: () => of([program]) } },
      { provide: ProjectService, useValue: { list: () => of([athena, hermes]) } },
      { provide: UserService, useValue: { list: () => of(users) } },
      { provide: PenaltyService, useValue: { ofProgram } },
    ],
  });
  const fixture = TestBed.createComponent(CohortsComponent);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('PFCs dos alunos'))!.click();
  await fixture.whenStable();
  const type = async (text: string) => {
    const input = host.querySelector<HTMLInputElement>('#pfc-search')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const choose = async (id: string, value: string) => {
    const select = host.querySelector<HTMLSelectElement>('#' + id)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const rows = () =>
    Array.from(host.querySelectorAll('tbody td.cell-strong')).map((td) => td.textContent?.trim());
  return { host, type, choose, rows };
}

describe('PFC management filters', () => {
  beforeAll(() => {
    // The table's scroll hint needs it; the test environment has no layout.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  it('shows every project without filters', async () => {
    const { rows, host } = await render('ADMIN');
    expect(rows()).toEqual(['Athena', 'Hermes']);
    expect(host.textContent).toContain('2 PFCs');
  });

  it('searches by project name, member name without accents and RGM', async () => {
    const { type, rows, host } = await render('ADMIN');
    await type('herm');
    expect(rows()).toEqual(['Hermes']);
    expect(host.textContent).toContain('1 de 2 PFCs');
    await type('joao');
    expect(rows()).toEqual(['Athena']);
    await type('222');
    expect(rows()).toEqual(['Hermes']);
  });

  it('filters by advisor and by having none', async () => {
    const { choose, rows } = await render('ADMIN');
    await choose('pfc-advisor-filter', 'prof');
    expect(rows()).toEqual(['Athena']);
    await choose('pfc-advisor-filter', 'NENHUM');
    expect(rows()).toEqual(['Hermes']);
    await choose('pfc-advisor-filter', 'TODOS');
    expect(rows()).toEqual(['Athena', 'Hermes']);
  });

  it('filters by status', async () => {
    const { choose, rows } = await render('ADMIN');
    await choose('pfc-status-filter', 'REPROVADO');
    expect(rows()).toEqual(['Hermes']);
    await choose('pfc-status-filter', 'EM_ANDAMENTO');
    expect(rows()).toEqual(['Athena']);
  });

  it('combines filters and explains an empty result', async () => {
    const { choose, type, rows, host } = await render('ADMIN');
    await type('athena');
    await choose('pfc-status-filter', 'REPROVADO');
    expect(rows()).toEqual([]);
    expect(host.textContent).toContain('Nenhum PFC encontrado com esses filtros.');
    expect(host.textContent).toContain('0 de 2 PFCs');
  });

  it('does not offer the advisor filter to an advisor', async () => {
    const { host } = await render('ORIENTADOR');
    expect(host.querySelector('#pfc-advisor-filter')).toBeNull();
    expect(host.querySelector('#pfc-status-filter')).not.toBeNull();
  });

  it('disables the status filter and keeps every group when the status failed to load', async () => {
    const { host, rows } = await render('ADMIN', () => throwError(() => new Error('serviço fora do ar')));
    expect(host.querySelector<HTMLSelectElement>('#pfc-status-filter')!.disabled).toBe(true);
    expect(rows()).toEqual(['Athena', 'Hermes']);
  });
});
