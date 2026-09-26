/**
 * Artigo retornado pela busca — ainda não salvo no projeto. Espelha
 * `referencia.ArtigoEncontrado` do backend, que consulta a OpenAlex (busca
 * por tema) e o Crossref (consulta por DOI).
 */
export interface ArtigoEncontrado {
  /** Ausente em trabalhos sem DOI — esses não podem ser adicionados à lista. */
  doi?: string;
  titulo: string;
  /** Já no formato de entrada ABNT: "SOBRENOME, Prenome". */
  autores: string[];
  ano?: number;
  /** Periódico, anais do evento ou livro. */
  veiculo?: string;
  citacoes: number;
  url?: string;
}

/** Resposta de GET /referencias/busca. */
export interface ResultadoBusca {
  total: number;
  pagina: number;
  artigos: ArtigoEncontrado[];
}

/** Resposta de GET /referencias/doi — pré-visualização antes de adicionar. */
export interface ReferenciaFormatada extends ArtigoEncontrado {
  /** Referência ABNT (NBR 6023) em texto puro. */
  abnt: string;
  /** A mesma referência com o destaque em <strong> — já escapada no backend. */
  abntHtml: string;
}

/**
 * Referência salva na lista do grupo. Como a entrega, é do PROJETO: um
 * integrante adiciona e o grupo inteiro vê.
 */
export interface Referencia {
  id: string;
  projetoId: string;
  doi: string;
  titulo: string;
  ano?: number;
  abnt: string;
  abntHtml: string;
  /** Nome de quem adicionou. */
  adicionadaPor: string;
  /** ISO 8601. */
  adicionadaEm: string;
}

/** "SILVA, Ana; SOUZA, Carlos" — a partir de 4 autores, o primeiro + et al. */
export function autoriaCurta(autores: string[]): string {
  if (autores.length === 0) {
    return 'Autoria não informada';
  }
  return autores.length > 3 ? `${autores[0]} et al.` : autores.join('; ');
}
