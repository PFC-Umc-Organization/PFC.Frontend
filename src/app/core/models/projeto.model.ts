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
  /** RGMs dos colegas (o criador não precisa se incluir). */
  integrantes: string[];
}

export interface AtualizacaoProjeto {
  nome?: string;
  descricao?: string;
}
