import { Activity, Submission, SubmissionStatus, fileNameOf } from '../models';

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

/** The answer of the activity's first file field, as a file name. */
export function submittedFileName(
  activity: Activity,
  answers: Record<string, string> | undefined,
): string | undefined {
  const field = activity.campos.find((c) => c.tipo === 'ARQUIVO');
  const answer = field ? answers?.[field.id] : undefined;
  return answer ? fileNameOf(answer) : undefined;
}

/** An edit in the same minute as the submission is not worth showing. */
export function editedLater(s: Pick<Submission, 'entregueEm' | 'atualizadaEm'>): boolean {
  if (!s.atualizadaEm || !s.entregueEm) {
    return !!s.atualizadaEm;
  }
  const minute = (iso: string) => Math.floor(new Date(iso).getTime() / 60_000);
  return minute(s.atualizadaEm) !== minute(s.entregueEm);
}

/**
 * What a grid cell shows. `blocked` is only a hint: a group can still submit
 * an activity whose predecessor is open, the backend does not hold it back.
 */
export type CellState = 'done' | 'done-late' | 'late' | 'waiting' | 'blocked';

/**
 * The cells of one project, in activity order. A submission still on time is
 * `waiting`, or `blocked` once any earlier activity is open (not submitted,
 * on time or not); `blockedBy` is the index of the first one.
 */
export function cellStates(statuses: SubmissionStatus[]): { state: CellState; blockedBy?: number }[] {
  let firstOpen: number | undefined;
  return statuses.map((status, i) => {
    let result: { state: CellState; blockedBy?: number };
    switch (status) {
      case 'ENTREGUE':
        result = { state: 'done' };
        break;
      case 'ENTREGUE_COM_ATRASO':
        result = { state: 'done-late' };
        break;
      case 'ATRASADO':
        result = { state: 'late' };
        break;
      default:
        result = firstOpen === undefined ? { state: 'waiting' } : { state: 'blocked', blockedBy: firstOpen };
    }
    if ((status === 'PENDENTE' || status === 'ATRASADO') && firstOpen === undefined) {
      firstOpen = i;
    }
    return result;
  });
}
