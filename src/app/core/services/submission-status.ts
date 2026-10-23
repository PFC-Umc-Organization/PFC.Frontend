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
