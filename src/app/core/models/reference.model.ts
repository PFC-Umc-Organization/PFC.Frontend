/** A search result (OpenAlex or Crossref), not saved in the project yet. */
export interface FoundArticle {
  /** Works without a DOI cannot be added. */
  doi?: string;
  titulo: string;
  /** Already in ABNT entry form: "SURNAME, Given names". */
  autores: string[];
  ano?: number;
  /** Journal, proceedings or book. */
  veiculo?: string;
  citacoes: number;
  url?: string;
}

export interface SearchResult {
  total: number;
  pagina: number;
  artigos: FoundArticle[];
}

/** `GET /referencias/doi`: the preview before adding. */
export interface FormattedReference extends FoundArticle {
  /** ABNT NBR 6023, plain text. */
  abnt: string;
  /** The same with the title in <strong>, escaped by the backend. */
  abntHtml: string;
}

/** A reference in the group's list; like submissions, it belongs to the project. */
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

/** "SILVA, Ana; SOUZA, Carlos"; from 4 authors on, the first one + et al. */
export function shortAuthorship(authors: string[]): string {
  if (authors.length === 0) {
    return 'Autoria não informada';
  }
  return authors.length > 3 ? `${authors[0]} et al.` : authors.join('; ');
}
