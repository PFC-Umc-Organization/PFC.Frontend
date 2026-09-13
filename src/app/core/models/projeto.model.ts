/**
 * Trabalho de PFC de um grupo de alunos, dentro de um Programa.
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
  /** Programa (turma) ao qual este PFC pertence — não há mais `cursoId` direto. */
  programaId: string;
  /**
   * RGMs dos alunos que compõem o grupo — não é `Usuario.id`. É assim que o
   * backend referencia integrante (`AssociarAluno.RGM`), porque um aluno
   * pode ser adicionado ao grupo antes mesmo de ter uma conta (Cognito)
   * criada — só precisa estar na allowlist de matrícula.
   */
  integrantes: string[];
  /**
   * Professor responsável pelo PFC. Só o coordenador de PFC pode definir —
   * o grupo nasce sem orientador, criado pelo próprio coordenador.
   */
  orientadorId?: string;
}

/** Projeto com os dados já resolvidos para exibição. */
export interface ProjetoDetalhe {
  projeto: Projeto;
  cursoNome: string;
  /**
   * `nome` vem `null` quando o RGM ainda não virou uma conta de verdade
   * (pré-autorizado, mas o aluno ainda não se cadastrou).
   */
  integrantes: { rgm: string; nome: string | null }[];
  orientador: { id: string; nome: string } | null;
}

/**
 * Cadastro do PFC — hoje feito pelo coordenador na tela de Gestão de PFC
 * (o backend restringe `POST /programas/:id/projetos` a esse perfil).
 */
export interface NovoProjeto {
  nome: string;
  descricao: string;
  programaId: string;
  /** RGMs dos integrantes iniciais — pode começar vazio e crescer depois. */
  integrantes: string[];
}

/** Edição feita pelo coordenador na tela de Gestão de PFC. */
export interface AtualizacaoProjeto {
  nome?: string;
  descricao?: string;
}
