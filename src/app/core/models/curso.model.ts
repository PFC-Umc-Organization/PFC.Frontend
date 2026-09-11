export type Turno = 'MANHA' | 'NOITE';

/**
 * Curso em que o PFC é ofertado. O mesmo curso pode existir em mais de um
 * turno (manhã e noite são ofertas distintas, com projetos distintos), por
 * isso o turno faz parte da identidade e não é só um rótulo.
 */
export interface Curso {
  id: string;
  /** Ex.: "Engenharia de Software". */
  nome: string;
  turno: Turno;
  /** Ex.: "2026.2" — usado para arquivar ofertas de semestres anteriores. */
  periodo: string;
}

export const ROTULO_TURNO: Record<Turno, string> = {
  MANHA: 'Manhã',
  NOITE: 'Noite',
};

/** Nome como aparece nos selects: "Engenharia de Software - Noite". */
export function rotuloCurso(curso: Curso): string {
  return `${curso.nome} - ${ROTULO_TURNO[curso.turno]}`;
}
