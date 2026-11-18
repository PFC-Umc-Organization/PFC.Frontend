import { ProjectPenalties, ProjectStatusRow, Submission, ValidationStatus } from '../../../core/models';
import { CellState, cellStates } from '../../../core/services/submission-status';
import { StatusGrid } from '../../../core/services/submission.service';
import { ActivityGroupItem } from '../activity-submissions/activity-submissions.component';
import { CellRef } from '../status-grid/status-grid.component';

// Filtros
export type RowFilter = 'all' | 'failed' | 'late' | 'awaiting' | 'rejected' | 'no-advisor';
export type PenaltyMap = ReadonlyMap<string, ProjectPenalties> | undefined;
export type PenaltyBand = 0 | 1 | 2 | 3;
export type MemberMap = ReadonlyMap<string, { rgm: string; nome: string }[]>;

// Faixa
export const bandOf = (active: number): PenaltyBand => Math.min(Math.max(active, 0), 3) as PenaltyBand;

// Normalização
export const folded = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Padrão
export const EMPTY_GRID: StatusGrid = { activities: [], rows: [], submissions: [] };

// Predicados
export const isSubmitted = (status: string): boolean => status === 'ENTREGUE' || status === 'ENTREGUE_COM_ATRASO';

const awaitingValidation = (row: ProjectStatusRow): boolean => row.cells.some((c) => isSubmitted(c.status) && !c.validation);
const hasLate = (row: ProjectStatusRow): boolean => row.cells.some((c) => c.status === 'ATRASADO');

// Indicadores
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

// Filtro
export function visibleGridOf(
  grid: StatusGrid,
  q: { search: string; advisorId: string; filter: RowFilter; penalties: PenaltyMap; band?: PenaltyBand | null; members?: MemberMap },
): StatusGrid {
  const term = folded(q.search.trim());
  const matches = (row: ProjectStatusRow): boolean =>
    folded(row.project.nome).includes(term) ||
    (q.members?.get(row.project.id) ?? []).some((m) => folded(m.nome).includes(term) || m.rgm.includes(term));
  const keep = (row: ProjectStatusRow): boolean => {
    if (term && !matches(row)) {
      return false;
    }
    if (q.advisorId && row.project.orientadorId !== q.advisorId) {
      return false;
    }
    if (q.band !== null && q.band !== undefined && q.penalties && bandOf(q.penalties.get(row.project.id)?.ativas ?? 0) !== q.band) {
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

// Indexação
const submissionsByKey = (grid: StatusGrid) => new Map(grid.submissions.map((s) => [`${s.projetoId}|${s.atividadeId}`, s]));

// Detalhe
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

// Detalhe
export function cellDetailOf(grid: StatusGrid, cell: CellRef | null) {
  const activity = cell && grid.activities.find((a) => a.id === cell.activityId);
  if (!cell || !activity) {
    return null;
  }
  const submission = grid.submissions.find((s) => s.projetoId === cell.projectId && s.atividadeId === cell.activityId) ?? null;
  return { ...cell, activity, submission };
}

// ---------------------------------------------------------------------------
// Visão geral
// ---------------------------------------------------------------------------

export interface OverviewDelivery {
  activityId: string;
  title: string;
  deadline: string;
  state: CellState;
  late: boolean;
  deliveredAt: string | null;
  validation?: ValidationStatus;
  validatedAt?: string;
}

// Entregas
export function overviewOf(grid: StatusGrid, projectId: string, penalties: PenaltyMap): OverviewDelivery[] {
  const row = grid.rows.find((r) => r.project.id === projectId);
  if (!row) {
    return [];
  }
  const waived = new Set(
    penalties?.get(projectId)?.penalidades.filter((p) => p.origem === 'PRAZO' && p.perdao && p.atividadeId).map((p) => p.atividadeId),
  );
  const states = cellStates(row.cells.map((c) => ({ ...c, waived: waived.has(c.activityId) })));
  const submissions = new Map<string, Submission>(grid.submissions.filter((s) => s.projetoId === projectId).map((s) => [s.atividadeId, s]));
  return row.cells.flatMap((c, i) => {
    const activity = grid.activities.find((a) => a.id === c.activityId);
    const submission = submissions.get(c.activityId);
    return activity
      ? [
          {
            activityId: c.activityId,
            title: activity.titulo,
            deadline: activity.prazo,
            state: states[i].state,
            late: c.status === 'ENTREGUE_COM_ATRASO',
            deliveredAt: submission?.entregueEm ?? null,
            validation: c.validation,
            validatedAt: submission?.validacao?.em,
          },
        ]
      : [];
  });
}
