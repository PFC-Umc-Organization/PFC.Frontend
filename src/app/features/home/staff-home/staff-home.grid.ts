import { ProjectPenalties, ProjectStatusRow } from '../../../core/models';
import { StatusGrid } from '../../../core/services/submission.service';
import { ActivityGroupItem } from '../activity-submissions/activity-submissions.component';
import { CellRef } from '../status-grid/status-grid.component';

export type RowFilter = 'all' | 'failed' | 'late' | 'awaiting' | 'rejected' | 'no-advisor';
export type PenaltyMap = ReadonlyMap<string, ProjectPenalties> | undefined;

export const EMPTY_GRID: StatusGrid = { activities: [], rows: [], submissions: [] };

export const isSubmitted = (status: string): boolean => status === 'ENTREGUE' || status === 'ENTREGUE_COM_ATRASO';

const awaitingValidation = (row: ProjectStatusRow): boolean => row.cells.some((c) => isSubmitted(c.status) && !c.validation);
const hasLate = (row: ProjectStatusRow): boolean => row.cells.some((c) => c.status === 'ATRASADO');

/**
 * Counted in projects, not cells: a cohort of hundreds of groups would turn
 * a cell count into noise. `failed` is undefined while the penalties load.
 */
export function indicatorsOf(grid: StatusGrid, penalties: PenaltyMap, now = new Date()) {
  const { rows, activities } = grid;
  const upcoming = activities.find((a) => new Date(a.prazo) > now);
  const delivered = upcoming
    ? rows.filter((r) => isSubmitted(r.cells.find((c) => c.activityId === upcoming.id)?.status ?? '')).length
    : 0;
  return {
    total: rows.length,
    failed: penalties ? rows.filter((r) => penalties.get(r.project.id)?.reprovado).length : undefined,
    late: rows.filter(hasLate).length,
    awaiting: rows.filter(awaitingValidation).length,
    next: upcoming ? { title: upcoming.titulo, deadline: upcoming.prazo, delivered, of: rows.length } : null,
  };
}

export function visibleGridOf(
  grid: StatusGrid,
  q: { search: string; advisorId: string; filter: RowFilter; penalties: PenaltyMap },
): StatusGrid {
  const term = q.search.trim().toLocaleLowerCase('pt-BR');
  const keep = (row: ProjectStatusRow): boolean => {
    if (term && !row.project.nome.toLocaleLowerCase('pt-BR').includes(term)) {
      return false;
    }
    if (q.advisorId && row.project.orientadorId !== q.advisorId) {
      return false;
    }
    switch (q.filter) {
      case 'failed':
        return !!q.penalties?.get(row.project.id)?.reprovado;
      case 'no-advisor':
        return !row.project.orientadorId;
      case 'late':
        return hasLate(row);
      case 'awaiting':
        return awaitingValidation(row);
      case 'rejected':
        return row.cells.some((c) => c.validation === 'NAO_VALIDADA');
    }
    return true;
  };
  return { ...grid, rows: grid.rows.filter(keep) };
}

const submissionsByKey = (grid: StatusGrid) => new Map(grid.submissions.map((s) => [`${s.projetoId}|${s.atividadeId}`, s]));

/** Every group's delivery for one activity, from the grid: no call. */
export function activityDetailOf(grid: StatusGrid, activityId: string | null) {
  const activity = activityId ? grid.activities.find((a) => a.id === activityId) : undefined;
  if (!activity) {
    return null;
  }
  const submissions = submissionsByKey(grid);
  const items = grid.rows.flatMap<ActivityGroupItem>((row) => {
    const cell = row.cells.find((c) => c.activityId === activity.id);
    if (!cell) {
      return [];
    }
    const submission = submissions.get(`${row.project.id}|${activity.id}`) ?? null;
    return [{ projectId: row.project.id, projectName: row.project.nome, status: cell.status, validation: cell.validation, submission }];
  });
  return { activity, items };
}

/** One cell's activity and submission, from the grid. */
export function cellDetailOf(grid: StatusGrid, cell: CellRef | null) {
  const activity = cell && grid.activities.find((a) => a.id === cell.activityId);
  if (!cell || !activity) {
    return null;
  }
  const submission = grid.submissions.find((s) => s.projetoId === cell.projectId && s.atividadeId === cell.activityId) ?? null;
  return { ...cell, activity, submission };
}
