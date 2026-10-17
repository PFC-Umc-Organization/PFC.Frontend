export type Turno = 'MANHA' | 'NOITE';

/**
 * Nome de um curso cadastrado (ver `Graduacao`). A turma guarda o nome do
 * curso; o backend só aceita nome de curso que existe.
 */
export type NomeCurso = string;

export interface Curso {
  id: string;
  nome: NomeCurso;
  turno: Turno;
  periodo: string;
}

export interface NovoCurso {
  nome: NomeCurso;
  turno: Turno;
  periodo: string;
}

export interface AtualizarCurso {
  nome: NomeCurso;
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
