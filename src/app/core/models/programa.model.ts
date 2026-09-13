/**
 * Programa agrupa os PFCs (projetos) de uma turma sob um Curso já existente.
 * Espelha `programa.Programa` do backend — é a entidade que falta pra ligar
 * `Projeto` a um `Curso`: um projeto pertence a um Programa, não a um curso
 * diretamente.
 */
export interface Programa {
  id: string;
  cursoId: string;
}

/** Corpo esperado em POST /programas. Só o coordenador de PFC pode criar. */
export interface NovoPrograma {
  cursoId: string;
}
