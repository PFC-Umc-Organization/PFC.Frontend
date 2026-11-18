import { Cohort, Program, isInTerm } from '../../../core/models';

// Seleção
export function pickCohortId(
  cohorts: Cohort[],
  programs: Program[],
  term: string,
  advisedProgramIds: ReadonlySet<string> | null,
): string {
  let candidates = cohorts;
  if (advisedProgramIds) {
    const followedCohorts = new Set(programs.filter((p) => advisedProgramIds.has(p.id)).map((p) => p.cursoId));
    const followed = cohorts.filter((c) => followedCohorts.has(c.id));
    if (followed.length) {
      candidates = followed;
    }
  }
  return (candidates.find((c) => isInTerm(c, term)) ?? candidates[0])?.id ?? '';
}
