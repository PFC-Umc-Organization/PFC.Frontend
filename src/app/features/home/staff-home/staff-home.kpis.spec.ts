import { ProjectPenalties } from '../../../core/models';
import { StatusGrid } from '../../../core/services/submission.service';
import { visibleGridOf } from './staff-home.grid';
import { breakdownOf, consolidatedRowsOf, factsOf, kpisOf } from './staff-home.kpis';

// Cenário
const grid = {
  activities: [
    { id: 'a1', titulo: 'Proposta', prazo: '2026-01-01T23:59' },
    { id: 'a2', titulo: 'Final', prazo: '2026-03-01T23:59' },
  ],
  rows: [
    { project: { id: 'p1', nome: 'Alfa' }, cells: [{ activityId: 'a1', status: 'ENTREGUE', validation: 'VALIDADA' }, { activityId: 'a2', status: 'ENTREGUE', validation: 'VALIDADA' }] },
    { project: { id: 'p2', nome: 'Beta' }, cells: [{ activityId: 'a1', status: 'ATRASADO' }, { activityId: 'a2', status: 'ATRASADO' }] },
    { project: { id: 'p3', nome: 'Gama' }, cells: [{ activityId: 'a1', status: 'ATRASADO' }, { activityId: 'a2', status: 'PENDENTE' }] },
  ],
  submissions: [],
} as unknown as StatusGrid;

const penalty = (projetoId: string, ativas: number, perdoadas: string[] = []): ProjectPenalties =>
  ({
    projetoId,
    ativas,
    limite: 3,
    reprovado: ativas >= 3,
    penalidades: perdoadas.map((atividadeId) => ({ id: `prazo-${atividadeId}`, origem: 'PRAZO', atividadeId, aplicadaEm: '', perdao: { motivo: 'x', por: 'y', em: '' } })),
  }) as ProjectPenalties;

const penalties = new Map([penalty('p1', 0), penalty('p2', 3), penalty('p3', 1, ['a1'])].map((p) => [p.projetoId, p]));
const now = new Date('2026-06-01');

describe('staff home KPIs', () => {
  const facts = factsOf(grid, penalties);
  const kpis = kpisOf(grid, facts, now);

  it('classifies each group as approved, failed or ongoing', () => {
    expect(facts.map((f) => f.outcome)).toEqual(['approved', 'failed', 'ongoing']);
    expect(kpis.outcome.approved.count).toBe(1);
    expect(Math.round(kpis.outcome.failed.pct)).toBe(33);
  });

  it('is unknown while penalties are loading', () => {
    expect(kpisOf(grid, factsOf(grid, undefined), now).outcome.known).toBe(false);
  });

  it('counts groups per penalty band and the forgiven ones', () => {
    expect(kpis.bands.items.map((b) => b.count)).toEqual([1, 1, 0, 1]);
    expect(kpis.bands.waived).toBe(1);
  });

  it('measures deliveries over the due activities and finds the bottleneck', () => {
    expect(kpis.efficiency.due).toBe(6);
    expect(Math.round(kpis.efficiency.completedRate!)).toBe(33);
    expect(Math.round(kpis.efficiency.issueRate!)).toBe(50);
    expect(kpis.efficiency.bottleneck).toEqual({ title: 'Proposta', count: 2 });
  });

  it('filters by penalty band and by member name or RGM', () => {
    const q = { search: '', advisorId: '', filter: 'all' as const, penalties };
    expect(visibleGridOf(grid, { ...q, band: 3 }).rows.map((r) => r.project.id)).toEqual(['p2']);
    const members = new Map([['p3', [{ rgm: '11231101228', nome: 'Ágatha Souza' }]]]);
    expect(visibleGridOf(grid, { ...q, search: 'agatha', members }).rows.map((r) => r.project.id)).toEqual(['p3']);
    expect(visibleGridOf(grid, { ...q, search: '1123110', members }).rows.map((r) => r.project.id)).toEqual(['p3']);
  });

  it('builds the consolidated rows with cohort, advisor and progress', () => {
    const rows = consolidatedRowsOf(facts, {
      members: new Map([['p1', [{ rgm: '1', nome: 'Ana' }]]]),
      cohortOf: () => 'ES (Noite, 2026.2)',
      advisorOf: (id) => id ?? 'Sem orientador',
    });
    expect(rows[0]).toMatchObject({ name: 'Alfa', members: ['Ana'], cohort: 'ES (Noite, 2026.2)', delivered: 2, total: 2, outcome: 'approved' });
    expect(rows[2]).toMatchObject({ advisor: 'Sem orientador', delivered: 0 });
  });

  it('breaks the rates down by group of projects', () => {
    const rows = breakdownOf(grid, facts, (f) => (f.projectId === 'p3' ? 'b' : 'a'), (f) => (f.projectId === 'p3' ? 'Sala B' : 'Sala A'), now);
    expect(rows.map((r) => [r.label, r.projects, r.penalties, r.approved, r.failed])).toEqual([
      ['Sala A', 2, 3, 1, 1],
      ['Sala B', 1, 1, 0, 0],
    ]);
    expect(rows[0].efficiency).toBe(50);
    expect(rows[1].efficiency).toBe(0);
  });
});
