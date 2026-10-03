export type Turno = 'MANHA' | 'NOITE';

/**
 * Cursos cobertos pelo sistema por enquanto — só a área de TI da
 * faculdade. Lista fechada de propósito: cadastrar turma é escolher um
 * destes, não digitar o nome livre.
 */
export type NomeCurso = 'Engenharia de Software' | 'Sistemas de Informação';

export const CURSOS_DISPONIVEIS: NomeCurso[] = [
  'Engenharia de Software',
  'Sistemas de Informação',
];

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
