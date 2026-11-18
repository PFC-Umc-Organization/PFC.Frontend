import { Activity, ProjectStatusRow, Submission, SubmissionStatus, ValidationStatus, fileNameOf } from '../models';

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

// Estados
export type CellState = 'waiting' | 'blocked' | 'late' | 'waived' | 'review' | 'returned' | 'done';

export interface CellInput {
  status: SubmissionStatus;
  validation?: ValidationStatus;
  // Perdão
  waived?: boolean;
}

function submittedState(validation: ValidationStatus | undefined): CellState {
  return validation === 'VALIDADA' ? 'done' : validation === 'NAO_VALIDADA' ? 'returned' : 'review';
}

// Células
export function cellStates(cells: CellInput[]): { state: CellState; blockedBy?: number }[] {
  let firstWaiting: number | undefined;
  return cells.map(({ status, validation, waived }, i) => {
    switch (status) {
      case 'ENTREGUE':
      case 'ENTREGUE_COM_ATRASO':
        return { state: submittedState(validation) };
      case 'ATRASADO':
        return { state: waived ? 'waived' : 'late' };
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
