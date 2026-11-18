import { ProjectPenalties } from '../../../core/models';
import { CellState, cellStates } from '../../../core/services/submission-status';
import { StatusGrid } from '../../../core/services/submission.service';
import { MemberMap, PenaltyBand, PenaltyMap, bandOf, isSubmitted } from './staff-home.grid';

// ---------------------------------------------------------------------------
// Fatos
// ---------------------------------------------------------------------------

export type Outcome = 'approved' | 'failed' | 'ongoing';

export interface RowFacts {
  projectId: string;
  name: string;
  advisorId?: string;
  states: CellState[];
  delivered: number;
  total: number;
  active?: number;
  limit?: number;
  waived?: number;
  outcome?: Outcome;
}

// Perdoadas
function waivedActivities(p: ProjectPenalties | undefined): Set<string | undefined> {
  return new Set(p?.penalidades.filter((x) => x.origem === 'PRAZO' && x.perdao && x.atividadeId).map((x) => x.atividadeId));
}

// Desfecho
function outcomeOf(states: CellState[], p: ProjectPenalties | undefined): Outcome {
  if (p?.reprovado) {
    return 'failed';
  }
  return states.length > 0 && states.every((s) => s === 'done' || s === 'waived') ? 'approved' : 'ongoing';
}

// Consolidação
export function factsOf(grid: StatusGrid, penalties: PenaltyMap): RowFacts[] {
  return grid.rows.map((row) => {
    const p = penalties?.get(row.project.id);
    const waived = waivedActivities(p);
    const states = cellStates(row.cells.map((c) => ({ ...c, waived: waived.has(c.activityId) }))).map((c) => c.state);
    return {
      projectId: row.project.id,
      name: row.project.nome,
      advisorId: row.project.orientadorId,
      states,
      delivered: row.cells.filter((c) => isSubmitted(c.status)).length,
      total: row.cells.length,
      active: penalties ? (p?.ativas ?? 0) : undefined,
      limit: p?.limite,
      waived: penalties ? (p?.penalidades.filter((x) => x.perdao).length ?? 0) : undefined,
      outcome: penalties ? outcomeOf(states, p) : undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

export interface Share {
  count: number;
  pct: number;
}

export interface Kpis {
  outcome: { known: boolean; total: number; approved: Share; failed: Share; ongoing: Share };
  bands: { known: boolean; items: ({ band: PenaltyBand } & Share)[]; waived: number };
  efficiency: {
    due: number;
    completedRate: number | null;
    issueRate: number | null;
    bottleneck: { title: string; count: number } | null;
  };
}

// Percentual
const share = (count: number, total: number): Share => ({ count, pct: total ? (count / total) * 100 : 0 });

// Cálculo
export function kpisOf(grid: StatusGrid, facts: RowFacts[], now = new Date()): Kpis {
  const known = facts.length > 0 && facts.every((f) => f.outcome !== undefined);
  const total = facts.length;
  const count = (o: Outcome) => facts.filter((f) => f.outcome === o).length;

  const bands = ([0, 1, 2, 3] as const).map((band) => ({
    band,
    ...share(facts.filter((f) => f.active !== undefined && bandOf(f.active) === band).length, total),
  }));

  const dueIds = new Set(grid.activities.filter((a) => new Date(a.prazo) <= now).map((a) => a.id));
  const titles = new Map(grid.activities.map((a) => [a.id, a.titulo]));
  const dueCells = grid.rows.flatMap((r) => r.cells.filter((c) => dueIds.has(c.activityId)));
  const completed = dueCells.filter((c) => isSubmitted(c.status)).length;
  const issues = dueCells.filter((c) => c.status === 'ATRASADO' || c.status === 'ENTREGUE_COM_ATRASO' || c.validation === 'NAO_VALIDADA').length;

  const lateByActivity = new Map<string, number>();
  for (const c of dueCells) {
    if (c.status === 'ATRASADO' || c.status === 'ENTREGUE_COM_ATRASO') {
      lateByActivity.set(c.activityId, (lateByActivity.get(c.activityId) ?? 0) + 1);
    }
  }
  const worst = [...lateByActivity.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    outcome: { known, total, approved: share(count('approved'), total), failed: share(count('failed'), total), ongoing: share(count('ongoing'), total) },
    bands: { known, items: bands, waived: facts.reduce((sum, f) => sum + (f.waived ?? 0), 0) },
    efficiency: {
      due: dueCells.length,
      completedRate: dueCells.length ? (completed / dueCells.length) * 100 : null,
      issueRate: dueCells.length ? (issues / dueCells.length) * 100 : null,
      bottleneck: worst ? { title: titles.get(worst[0]) ?? '', count: worst[1] } : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Linhas
// ---------------------------------------------------------------------------

export const OUTCOME_LABEL: Record<Outcome, string> = { approved: 'Aprovado', failed: 'Reprovado', ongoing: 'Em andamento' };

export interface ConsolidatedRow {
  projectId: string;
  name: string;
  members: string[];
  cohort: string;
  advisor: string;
  delivered: number;
  total: number;
  active?: number;
  limit?: number;
  outcome?: Outcome;
}

export interface RowContext {
  members: MemberMap;
  cohortOf: (projectId: string) => string;
  advisorOf: (advisorId: string | undefined) => string;
}

// Montagem
export function consolidatedRowsOf(facts: RowFacts[], ctx: RowContext): ConsolidatedRow[] {
  return facts.map((f) => ({
    projectId: f.projectId,
    name: f.name,
    members: (ctx.members.get(f.projectId) ?? []).map((m) => m.nome),
    cohort: ctx.cohortOf(f.projectId),
    advisor: ctx.advisorOf(f.advisorId),
    delivered: f.delivered,
    total: f.total,
    active: f.active,
    limit: f.limit,
    outcome: f.outcome,
  }));
}
