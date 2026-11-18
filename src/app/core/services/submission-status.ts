import { Activity, ProjectStatusRow, Submission, SubmissionStatus, fileNameOf } from '../models';

// Status
export function submissionStatus(
  deadline: string,
  submittedAt: string | null | undefined,
  now = new Date(),
): SubmissionStatus {
  const limit = new Date(deadline);
  if (submittedAt) {
    return new Date(submittedAt) > limit ? 'ENTREGUE_COM_ATRASO' : 'ENTREGUE';
  }
  return now > limit ? 'ATRASADO' : 'PENDENTE';
}

// Nome
export function submittedFileName(
  activity: Activity,
  answers: Record<string, string> | undefined,
): string | undefined {
  const field = activity.campos.find((c) => c.tipo === 'ARQUIVO');
  const answer = field ? answers?.[field.id] : undefined;
  return answer ? fileNameOf(answer) : undefined;
}

// Comparação
export function editedLater(s: Pick<Submission, 'entregueEm' | 'atualizadaEm'>): boolean {
  if (!s.atualizadaEm || !s.entregueEm) {
    return !!s.atualizadaEm;
  }
  const minute = (iso: string) => Math.floor(new Date(iso).getTime() / 60_000);
  return minute(s.atualizadaEm) !== minute(s.entregueEm);
}

// Tipo
export type CellState = 'done' | 'done-late' | 'late' | 'waiting' | 'blocked';

// Estados
export function cellStates(statuses: SubmissionStatus[]): { state: CellState; blockedBy?: number }[] {
  let firstWaiting: number | undefined;
  return statuses.map((status, i) => {
    switch (status) {
      case 'ENTREGUE':
        return { state: 'done' };
      case 'ENTREGUE_COM_ATRASO':
        return { state: 'done-late' };
      case 'ATRASADO':
        return { state: 'late' };
      default:
        if (firstWaiting === undefined) {
          firstWaiting = i;
          return { state: 'waiting' };
        }
        return { state: 'blocked', blockedBy: firstWaiting };
    }
  });
}

// Montagem
export function buildStatusGrid(
  unordered: Activity[],
  projects: { id: string; nome: string; orientadorId?: string }[],
  submissions: Submission[],
): { activities: Activity[]; rows: ProjectStatusRow[]; submissions: Submission[] } {
  const activities = [...unordered].sort((a, b) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime());
  return {
    activities,
    submissions,
    rows: projects.map<ProjectStatusRow>((project) => ({
      project: { id: project.id, nome: project.nome, orientadorId: project.orientadorId },
      cells: activities.map((activity) => {
        const submission = submissions.find((s) => s.projetoId === project.id && s.atividadeId === activity.id);
        return {
          activityId: activity.id,
          status: submissionStatus(activity.prazo, submission?.entregueEm),
          validation: submission?.validacao?.status,
        };
      }),
    })),
  };
}
