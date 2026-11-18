// ---------------------------------------------------------------------------
// Turmas
// ---------------------------------------------------------------------------

export type Shift = 'MANHA' | 'NOITE';

export interface Cohort {
  id: string;
  graduacaoId?: string;
  nome: string;
  turno: Shift;
  periodo: string;
}

// Criação
export interface NewCohort {
  nome: string;
  turno: Shift;
  periodo: string;
}

// Atualização
export type CohortUpdate = NewCohort;

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

export const SHIFT_LABEL: Record<Shift, string> = {
  MANHA: 'Manhã',
  NOITE: 'Noite',
};

export function courseShiftLabel(cohort: Cohort): string {
  return `${cohort.nome} (${SHIFT_LABEL[cohort.turno]})`;
}

export function cohortLabel(cohort: Cohort): string {
  return `${cohort.nome} (${SHIFT_LABEL[cohort.turno]}, ${cohort.periodo})`;
}

// ---------------------------------------------------------------------------
// Período
// ---------------------------------------------------------------------------

export function currentTerm(today: Date = new Date()): string {
  return `${today.getFullYear()}.${today.getMonth() < 6 ? 1 : 2}`;
}

export function isInTerm(cohort: Cohort, term: string): boolean {
  const key = (t: string) => {
    const m = /^\s*(\d{4})\D*([12])\s*$/.exec(t);
    return m ? `${m[1]}.${m[2]}` : t.trim();
  };
  return key(cohort.periodo) === key(term);
}
