export type Turno = 'MANHA' | 'NOITE';


export interface Curso {
  id: string;
  /** Ex.: "Engenharia de Software". */
  nome: string;
  turno: Turno;
  periodo: string;
}

export const ROTULO_TURNO: Record<Turno, string> = {
  MANHA: 'Manhã',
  NOITE: 'Noite',
};


export function rotuloCurso(curso: Curso): string {
  return `${curso.nome} - ${ROTULO_TURNO[curso.turno]}`;
}
