/**
 * Trabalho de PFC de um grupo de alunos, dentro de um curso.
 *
 * A entrega é do PROJETO, não de cada integrante: o grupo entrega um único
 * documento por etapa. Por isso `Entrega` referencia `projetoId` — marcar uma
 * etapa como concluída vale para todo o grupo.
 */
export interface Projeto {
  id: string;
  /** Ex.: "Athena", "Web-Cursos". */
  nome: string;
  descricao: string;
  cursoId: string;
  /** Ids dos alunos que compõem o grupo. */
  integrantes: string[];
}

/** Projeto com os dados já resolvidos para exibição. */
export interface ProjetoDetalhe {
  projeto: Projeto;
  cursoNome: string;
  integrantes: { id: string; nome: string; email: string }[];
}

/** Cadastro do PFC feito pelo próprio aluno — uma vez só por grupo. */
export interface NovoProjeto {
  nome: string;
  descricao: string;
  cursoId: string;
  /** Inclui quem está cadastrando; os demais vêm da lista do professor. */
  integrantes: string[];
}
