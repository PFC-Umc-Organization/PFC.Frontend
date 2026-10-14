export interface Projeto {
  id: string;
  nome: string;
  descricao: string;
  programaId: string;
  integrantes: string[];
  orientadorId?: string;
}

export interface ProjetoDetalhe {
  projeto: Projeto;
  cursoNome: string;
  integrantes: { rgm: string; nome: string | null }[];
  orientador: { id: string; nome: string } | null;
}


export interface NovoProjeto {
  nome: string;
  descricao: string;
  programaId: string;
  integrantes: string[];
}

/** O aluno cria o projeto do próprio grupo: ele entra sozinho como integrante. */
export interface NovoProjetoDoAluno {
  nome: string;
  descricao: string;
  /** RGMs dos colegas, que recebem convite (o criador não precisa se incluir). */
  integrantes: string[];
}

/**
 * Convite pendente pra um aluno entrar no grupo — espelha `projeto.Convite`
 * do backend. Só existe enquanto ninguém respondeu: aceitou, recusou ou foi
 * cancelado, some.
 */
export interface Convite {
  projetoId: string;
  projetoNome: string;
  /** RGM de quem foi convidado. */
  rgm: string;
  /** Nome de quem convidou. */
  convidadoPor: string;
  /** Data/hora ISO (UTC). */
  criadoEm: string;
}

export interface AtualizacaoProjeto {
  nome?: string;
  descricao?: string;
}
