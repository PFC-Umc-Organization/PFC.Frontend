// ---------------------------------------------------------------------------
// Busca
// ---------------------------------------------------------------------------

export interface FoundArticle {
  doi?: string;
  titulo: string;
  autores: string[];
  ano?: number;
  veiculo?: string;
  citacoes: number;
  url?: string;
}

// Resultado
export interface SearchResult {
  total: number;
  pagina: number;
  artigos: FoundArticle[];
}

// ---------------------------------------------------------------------------
// Referências
// ---------------------------------------------------------------------------

export interface FormattedReference extends FoundArticle {
  abnt: string;
  abntHtml: string;
}

export interface Reference {
  id: string;
  projetoId: string;
  doi: string;
  titulo: string;
  ano?: number;
  abnt: string;
  abntHtml: string;
  adicionadaPor: string;
  adicionadaEm: string;
}

// Formatação
export function shortAuthorship(authors: string[]): string {
  if (authors.length === 0) {
    return 'Autoria não informada';
  }
  return authors.length > 3 ? `${authors[0]} et al.` : authors.join('; ');
}
