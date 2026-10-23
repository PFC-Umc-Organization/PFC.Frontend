export type Shift = 'MANHA' | 'NOITE';

/** A cohort (turma): a course in a shift and term. */
export interface Cohort {
  id: string;
  /** The course id; missing in cohorts older than the course registry. */
  graduacaoId?: string;
  nome: string;
  turno: Shift;
  periodo: string;
}

export interface NewCohort {
  nome: string;
  turno: Shift;
  periodo: string;
}

export type CohortUpdate = NewCohort;

export const SHIFT_LABEL: Record<Shift, string> = {
  MANHA: 'Manhã',
  NOITE: 'Noite',
};

export function courseShiftLabel(cohort: Cohort): string {
  return `${cohort.nome} (${SHIFT_LABEL[cohort.turno]})`;
}

/** With the term: tells apart the same course and shift in different semesters. */
export function cohortLabel(cohort: Cohort): string {
  return `${cohort.nome} (${SHIFT_LABEL[cohort.turno]}, ${cohort.periodo})`;
}

/** The term of a date in the cohorts' format: Jan–Jun is ".1", Jul–Dec is ".2". */
export function currentTerm(today: Date = new Date()): string {
  return `${today.getFullYear()}.${today.getMonth() < 6 ? 1 : 2}`;
}

/** Old cohorts were saved as "2026/2" or "2026-2"; compares year and half only. */
export function isInTerm(cohort: Cohort, term: string): boolean {
  const key = (t: string) => {
    const m = /^\s*(\d{4})\D*([12])\s*$/.exec(t);
    return m ? `${m[1]}.${m[2]}` : t.trim();
  };
  return key(cohort.periodo) === key(term);
}
