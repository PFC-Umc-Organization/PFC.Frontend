import { Activity, ProjectPenalties } from '../../../core/models';
import { countdownOf, nextActionOf, penaltySummaryOf, progressOf } from './student-home.kpis';

const now = new Date('2026-06-10T12:00:00');
const activity = (id: string, prazo: string) => ({ id, titulo: `Atividade ${id}`, prazo }) as Activity;

describe('student home KPIs', () => {
  it('counts only validated activities as progress', () => {
    expect(progressOf(['done', 'review', 'late', 'done'])).toEqual({ done: 2, total: 4, pct: 50 });
    expect(progressOf([])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it('counts down in days and flags overdue deadlines', () => {
    expect(countdownOf('2026-06-13T12:00:00', now)).toEqual({ text: 'Faltam 3 dias', overdue: false });
    expect(countdownOf('2026-06-10T20:00:00', now)).toEqual({ text: 'Vence hoje', overdue: false });
    expect(countdownOf('2026-06-07T12:00:00', now)).toEqual({ text: 'Prazo vencido há 3 dias', overdue: true });
  });

  it('picks the earliest actionable activity: pending, returned or forgiven', () => {
    const activities = [activity('a1', '2026-06-01T23:59'), activity('a2', '2026-06-20T23:59'), activity('a3', '2026-06-25T23:59')];
    expect(nextActionOf(activities, ['done', 'waiting', 'blocked'], now)).toMatchObject({ activityId: 'a2', state: 'waiting', overdue: false });
    expect(nextActionOf(activities, ['waived', 'waiting', 'blocked'], now)).toMatchObject({ activityId: 'a1', state: 'waived', overdue: true });
    expect(nextActionOf(activities, ['done', 'review', 'late'], now)).toBeNull();
  });

  it('summarises active, forgiven and remaining penalties', () => {
    const p = { ativas: 1, limite: 3, penalidades: [{ perdao: { motivo: 'x' } }, { perdao: null }] } as unknown as ProjectPenalties;
    expect(penaltySummaryOf(p)).toEqual({ active: 1, limit: 3, waived: 1, margin: 2 });
    expect(penaltySummaryOf({ ...p, ativas: 4 }).margin).toBe(0);
  });
});
