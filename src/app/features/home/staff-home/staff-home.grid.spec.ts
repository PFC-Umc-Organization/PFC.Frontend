import { StatusGrid } from '../../../core/services/submission.service';
import { activityDetailOf, indicatorsOf, visibleGridOf } from './staff-home.grid';

const grid = {
  activities: [
    { id: 'a1', titulo: 'Proposta', prazo: '2020-01-01T23:59:00-03:00' },
    { id: 'a2', titulo: 'Final', prazo: '2099-01-01T23:59:00-03:00' },
  ],
  rows: [
    { project: { id: 'p1', nome: 'Alfa', orientadorId: 'o1' }, cells: [{ activityId: 'a1', status: 'ENTREGUE' }, { activityId: 'a2', status: 'ENTREGUE' }] },
    { project: { id: 'p2', nome: 'Beta' }, cells: [{ activityId: 'a1', status: 'ATRASADO' }, { activityId: 'a2', status: 'PENDENTE' }] },
  ],
  submissions: [{ projetoId: 'p1', atividadeId: 'a1' }],
} as unknown as StatusGrid;

describe('staff home grid', () => {
  it('counts projects, not cells', () => {
    const i = indicatorsOf(grid, undefined, new Date('2026-01-01'));
    expect(i).toMatchObject({ total: 2, late: 1, awaiting: 1, failed: undefined });
    expect(i.next).toMatchObject({ title: 'Final', delivered: 1, of: 2 });
  });

  it('filters by name, advisor and status', () => {
    const q = { search: '', advisorId: '', filter: 'all' as const, penalties: undefined };
    expect(visibleGridOf(grid, { ...q, search: 'bet' }).rows.map((r) => r.project.id)).toEqual(['p2']);
    expect(visibleGridOf(grid, { ...q, advisorId: 'o1' }).rows.map((r) => r.project.id)).toEqual(['p1']);
    expect(visibleGridOf(grid, { ...q, filter: 'late' }).rows.map((r) => r.project.id)).toEqual(['p2']);
    expect(visibleGridOf(grid, { ...q, filter: 'no-advisor' }).rows.map((r) => r.project.id)).toEqual(['p2']);
  });

  it('finds each group submission for an activity without a call', () => {
    const d = activityDetailOf(grid, 'a1')!;
    expect(d.items.map((i) => [i.projectId, !!i.submission])).toEqual([['p1', true], ['p2', false]]);
    expect(activityDetailOf(grid, 'nope')).toBeNull();
  });
});
