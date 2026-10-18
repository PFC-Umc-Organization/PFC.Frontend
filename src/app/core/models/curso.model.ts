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

/** Rótulo com o período: separa turmas do mesmo curso e turno em semestres diferentes. */
export function rotuloTurma(curso: Curso): string {
  return `${rotuloCurso(curso)} - ${curso.periodo}`;
}

/** Semestre de uma data no formato das turmas: jan–jun é ".1", jul–dez é ".2". */
export function periodoAtual(hoje: Date = new Date()): string {
  return `${hoje.getFullYear()}.${hoje.getMonth() < 6 ? 1 : 2}`;
}

/**
 * O período da turma é texto livre no cadastro; compara só ano e semestre
 * para "2026.2", "2026/2" e "2026-2" valerem igual.
 */
export function ehDoPeriodo(curso: Curso, periodo: string): boolean {
  const chave = (p: string) => {
    const m = /^\s*(\d{4})\D*([12])\s*$/.exec(p);
    return m ? `${m[1]}.${m[2]}` : p.trim();
  };
  return chave(curso.periodo) === chave(periodo);
}
