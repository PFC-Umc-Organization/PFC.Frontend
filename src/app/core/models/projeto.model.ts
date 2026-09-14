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

export interface AtualizacaoProjeto {
  nome?: string;
  descricao?: string;
}
