import { Project, ProjectPenalties, ProjectStatus } from '../../../core/models';
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
  cells: { activityId: string; state: CellState }[];
  delivered: number;
  total: number;
  active?: number;
  limit?: number;
  waived?: number;
  status?: ProjectStatus;
  manual: boolean;
  note?: string;
  outcome?: Outcome;
}

// Perdoadas
function waivedActivities(p: ProjectPenalties | undefined): Set<string | undefined> {
  return new Set(p?.penalidades.filter((x) => x.origem === 'PRAZO' && x.perdao && x.atividadeId).map((x) => x.atividadeId));
}

// Sugestão: reprovado com 3 penalidades, atenção com 2 ou com entrega atrasada, WIP nos demais
export function suggestedStatus(states: CellState[], p: ProjectPenalties): ProjectStatus {
  if (p.reprovado) {
    return 'REPROVADO';
  }
  return p.ativas >= 2 || states.includes('late') ? 'ATENCAO' : 'WIP';
}

// Status
export function statusOf(project: Pick<Project, 'id' | 'status'>, states: CellState[], p: ProjectPenalties | undefined, penaltiesKnown: boolean): ProjectStatus | undefined {
  if (project.status) {
    return project.status;
  }
  if (!penaltiesKnown) {
    return undefined;
  }
  return suggestedStatus(states, p ?? { projetoId: project.id, ativas: 0, limite: 3, reprovado: false, penalidades: [] });
}

// Desfecho
export function outcomeOf(status: ProjectStatus | undefined): Outcome | undefined {
  switch (status) {
    case undefined:
      return undefined;
    case 'REPROVADO':
      return 'failed';
    case 'APROVADO':
    case 'APROVADO_COM_RESSALVAS':
      return 'approved';
  }
  return 'ongoing';
}

// Consolidação
export function factsOf(grid: StatusGrid, penalties: PenaltyMap): RowFacts[] {
  return grid.rows.map((row) => {
    const p = penalties?.get(row.project.id);
    const waived = waivedActivities(p);
    const states = cellStates(row.cells.map((c) => ({ ...c, waived: waived.has(c.activityId) }))).map((c) => c.state);
    const status = statusOf(row.project, states, p, !!penalties);
    return {
      cells: row.cells.map((c, i) => ({ activityId: c.activityId, state: states[i] })),
      projectId: row.project.id,
      name: row.project.nome,
      advisorId: row.project.orientadorId,
      states,
      delivered: row.cells.filter((c) => isSubmitted(c.status)).length,
      total: row.cells.length,
      active: penalties ? (p?.ativas ?? 0) : undefined,
      limit: p?.limite,
      waived: penalties ? (p?.penalidades.filter((x) => x.perdao).length ?? 0) : undefined,
      status,
      manual: !!row.project.status,
      note: row.project.ressalva,
      outcome: outcomeOf(status),
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
  bands: { known: boolean; items: ({ band: PenaltyBand } & Share)[]; waived: number; activeTotal: number };
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
    bands: {
      known,
      items: bands,
      waived: facts.reduce((sum, f) => sum + (f.waived ?? 0), 0),
      activeTotal: facts.reduce((sum, f) => sum + (f.active ?? 0), 0),
    },
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

export interface ConsolidatedRow {
  projectId: string;
  name: string;
  members: string[];
  memberList: { rgm: string; nome: string }[];
  states: CellState[];
  cells: { activityId: string; state: CellState }[];
  cohort: string;
  advisor: string;
  delivered: number;
  total: number;
  active?: number;
  limit?: number;
  status?: ProjectStatus;
  manual: boolean;
  note?: string;
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
    memberList: ctx.members.get(f.projectId) ?? [],
    states: f.states,
    cells: f.cells,
    cohort: ctx.cohortOf(f.projectId),
    advisor: ctx.advisorOf(f.advisorId),
    delivered: f.delivered,
    total: f.total,
    active: f.active,
    limit: f.limit,
    status: f.status,
    manual: f.manual,
    note: f.note,
    outcome: f.outcome,
  }));
}

// ---------------------------------------------------------------------------
// Comparativo
// ---------------------------------------------------------------------------

export interface BreakdownRow {
  key: string;
  label: string;
  projects: number;
  efficiency: number | null;
  penalties: number | undefined;
  approved: number;
  failed: number;
}

// Agrupamento
export function breakdownOf(
  grid: StatusGrid,
  facts: RowFacts[],
  keyOf: (f: RowFacts) => string,
  labelOf: (f: RowFacts) => string,
  now = new Date(),
): BreakdownRow[] {
  const groups = new Map<string, RowFacts[]>();
  for (const f of facts) {
    groups.set(keyOf(f), [...(groups.get(keyOf(f)) ?? []), f]);
  }
  return [...groups.entries()]
    .map(([key, members]) => {
      const ids = new Set(members.map((m) => m.projectId));
      const part = { ...grid, rows: grid.rows.filter((r) => ids.has(r.project.id)) };
      return {
        key,
        label: labelOf(members[0]),
        projects: members.length,
        efficiency: kpisOf(part, members, now).efficiency.completedRate,
        penalties: members.some((m) => m.active === undefined) ? undefined : members.reduce((sum, m) => sum + (m.active ?? 0), 0),
        approved: members.filter((m) => m.outcome === 'approved').length,
        failed: members.filter((m) => m.outcome === 'failed').length,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}
