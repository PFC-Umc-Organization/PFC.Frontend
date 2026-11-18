import { Activity, ProjectPenalties } from '../../../core/models';
import { CellState } from '../../../core/services/submission-status';

// ---------------------------------------------------------------------------
// Progresso
// ---------------------------------------------------------------------------

export interface Progress {
  done: number;
  total: number;
  pct: number;
}

// Contagem
export function progressOf(states: CellState[]): Progress {
  const done = states.filter((s) => s === 'done').length;
  return { done, total: states.length, pct: states.length ? (done / states.length) * 100 : 0 };
}

// ---------------------------------------------------------------------------
// Próxima entrega
// ---------------------------------------------------------------------------

export interface NextAction {
  activityId: string;
  title: string;
  deadline: string;
  state: 'waiting' | 'returned' | 'waived';
  countdown: string;
  overdue: boolean;
}

// Contagem regressiva
export function countdownOf(deadline: string, now: Date): { text: string; overdue: boolean } {
  const ms = new Date(deadline).getTime() - now.getTime();
  const days = Math.ceil(ms / 86_400_000);
  if (ms < 0) {
    const late = Math.floor(-ms / 86_400_000);
    return { text: late < 1 ? 'Prazo vencido hoje' : late === 1 ? 'Prazo vencido há 1 dia' : `Prazo vencido há ${late} dias`, overdue: true };
  }
  if (days <= 1) {
    return { text: 'Vence hoje', overdue: false };
  }
  return { text: `Faltam ${days} dias`, overdue: false };
}

// Seleção
export function nextActionOf(activities: Activity[], states: CellState[], now: Date): NextAction | null {
  const actionable = activities
    .map((a, i) => ({ a, state: states[i] }))
    .filter((x): x is { a: Activity; state: NextAction['state'] } => x.state === 'waiting' || x.state === 'returned' || x.state === 'waived')
    .sort((x, y) => new Date(x.a.prazo).getTime() - new Date(y.a.prazo).getTime())[0];
  if (!actionable) {
    return null;
  }
  const { text, overdue } = countdownOf(actionable.a.prazo, now);
  return { activityId: actionable.a.id, title: actionable.a.titulo, deadline: actionable.a.prazo, state: actionable.state, countdown: text, overdue };
}

// ---------------------------------------------------------------------------
// Penalidades
// ---------------------------------------------------------------------------

export interface PenaltySummary {
  active: number;
  limit: number;
  waived: number;
  margin: number;
}

// Resumo
export function penaltySummaryOf(p: ProjectPenalties): PenaltySummary {
  return {
    active: p.ativas,
    limit: p.limite,
    waived: p.penalidades.filter((x) => x.perdao).length,
    margin: Math.max(p.limite - p.ativas, 0),
  };
}
