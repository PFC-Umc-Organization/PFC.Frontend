import { Cohort, Program, isInTerm } from '../../../core/models';

/**
 * The cohort the panel opens on: one of the current term or, failing that, the
 * first. With `advisedProgramIds` (an advisor), only the cohorts whose program
 * has a project they advise, when there is any.
 */
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
