import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, delay, map, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ArtigoEncontrado,
  Referencia,
  ReferenciaFormatada,
  ResultadoBusca,
} from '../models';
import { AuthService } from './auth.service';
import { erroHttp } from './http-erro';

/**
 * Referências bibliográficas do PFC. O backend integra duas APIs externas:
 * OpenAlex (busca por tema) e Crossref (metadados pelo DOI), e formata a
 * referência em ABNT. O front nunca chama essas APIs direto.
 */
export abstract class ReferenciaService {
  abstract buscar(termo: string, pagina?: number): Observable<ResultadoBusca>;
  abstract porDoi(doi: string): Observable<ReferenciaFormatada>;
  abstract listarDoProjeto(projetoId: string): Observable<Referencia[]>;
  /** Só o DOI — o backend busca os metadados de novo no Crossref. */
  abstract adicionar(projetoId: string, doi: string): Observable<Referencia>;
  abstract remover(projetoId: string, referenciaId: string): Observable<void>;
}

/* -------------------------------------------------------------------------- */
/*                                    mock                                    */
/* -------------------------------------------------------------------------- */

/**
 * Metadados e ABNT reais, gerados pelo formatador do backend a partir do
 * Crossref — o modo demonstração mostra exatamente o que a API devolveria.
 */
const ARTIGOS_MOCK: ReferenciaFormatada[] = [
  {
    doi: '10.1590/0103-37862014000200006',
    titulo:
      'Comparativo dos softwares de gerenciamento de referências bibliográficas: Mendeley, EndNote e Zotero',
    autores: [
      'YAMAKAWA, Eduardo Kazumi',
      'KUBOTA, Flávio Issao',
      'BEUREN, Fernanda Hansch',
      'SCALVENZI, Lisiane',
      'MIGUEL, Paulo Augusto Cauchik',
    ],
    ano: 2014,
    veiculo: 'Transinformação',
    citacoes: 19,
    url: 'https://doi.org/10.1590/0103-37862014000200006',
    abnt: 'YAMAKAWA, Eduardo Kazumi et al. Comparativo dos softwares de gerenciamento de referências bibliográficas: Mendeley, EndNote e Zotero. Transinformação, v. 26, n. 2, p. 167-176, 2014. DOI: 10.1590/0103-37862014000200006. Disponível em: https://doi.org/10.1590/0103-37862014000200006. Acesso em: 12 set. 2026.',
    abntHtml: '',
  },
  {
    doi: '10.1590/s0104-530x2008000100011',
    titulo:
      'Fatores críticos de sucesso no gerenciamento de projetos de desenvolvimento de produto em empresas de base tecnológica de pequeno e médio porte',
    autores: [
      'TOLEDO, José Carlos de',
      'SILVA, Sérgio Luís da',
      'MENDES, Glauco Henrique Souza',
      'JUGEND, Daniel',
    ],
    ano: 2008,
    veiculo: 'Gestão & Produção',
    citacoes: 26,
    url: 'https://doi.org/10.1590/s0104-530x2008000100011',
    abnt: 'TOLEDO, José Carlos de et al. Fatores críticos de sucesso no gerenciamento de projetos de desenvolvimento de produto em empresas de base tecnológica de pequeno e médio porte. Gestão & Produção, v. 15, n. 1, p. 117-134, 2008. DOI: 10.1590/s0104-530x2008000100011. Disponível em: https://doi.org/10.1590/s0104-530x2008000100011. Acesso em: 12 set. 2026.',
    abntHtml: '',
  },
  {
    doi: '10.1590/s0103-65132012005000091',
    titulo: 'Relacionamento entre gerenciamento de risco e sucesso de projetos',
    autores: ['RABECHINI JUNIOR, Roque', 'CARVALHO, Marly Monteiro de'],
    ano: 2012,
    veiculo: 'Production',
    citacoes: 8,
    url: 'https://doi.org/10.1590/s0103-65132012005000091',
    abnt: 'RABECHINI JUNIOR, Roque; CARVALHO, Marly Monteiro de. Relacionamento entre gerenciamento de risco e sucesso de projetos. Production, v. 23, n. 3, p. 570-581, 2012. DOI: 10.1590/s0103-65132012005000091. Disponível em: https://doi.org/10.1590/s0103-65132012005000091. Acesso em: 12 set. 2026.',
    abntHtml: '',
  },
  {
    doi: '10.1590/s0104-530x2011000200014',
    titulo:
      'A organização da atividade de gerenciamento de projetos: os nexos com competências e estrutura',
    autores: [
      'RABECHINI JUNIOR, Roque',
      'CARVALHO, Marly Monteiro de',
      'RODRIGUES, Ivete',
      'SBRAGIA, Roberto',
    ],
    ano: 2011,
    veiculo: 'Gestão & Produção',
    citacoes: 13,
    url: 'https://doi.org/10.1590/s0104-530x2011000200014',
    abnt: 'RABECHINI JUNIOR, Roque et al. A organização da atividade de gerenciamento de projetos: os nexos com competências e estrutura. Gestão & Produção, v. 18, n. 2, p. 409-424, 2011. DOI: 10.1590/s0104-530x2011000200014. Disponível em: https://doi.org/10.1590/s0104-530x2011000200014. Acesso em: 12 set. 2026.',
    abntHtml: '',
  },
  {
    doi: '10.1145/3290605.3300233',
    titulo: 'Guidelines for Human-AI Interaction',
    autores: [
      'AMERSHI, Saleema',
      'WELD, Dan',
      'VORVOREANU, Mihaela',
      'FOURNEY, Adam',
    ],
    ano: 2019,
    veiculo:
      'Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems',
    citacoes: 2047,
    url: 'https://doi.org/10.1145/3290605.3300233',
    abnt: 'AMERSHI, Saleema et al. Guidelines for Human-AI Interaction. In: Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems. New York, NY, USA: ACM, 2019. p. 1-13. DOI: 10.1145/3290605.3300233. Disponível em: https://doi.org/10.1145/3290605.3300233. Acesso em: 12 set. 2026.',
    abntHtml: '',
  },
].map((a) => ({ ...a, abntHtml: destacar(a.abnt, a.veiculo) }));

function escaparHtml(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Replica o `abntHtml` do backend: veículo em <strong>. */
function destacar(abnt: string, veiculo: string): string {
  const v = escaparHtml(veiculo);
  return escaparHtml(abnt).replace(v, `<strong>${v}</strong>`);
}

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

@Injectable()
export class ReferenciaMockService extends ReferenciaService {
  private readonly auth = inject(AuthService);
  private readonly referencias$ = new BehaviorSubject<Referencia[]>([]);

  override buscar(termo: string, pagina = 1): Observable<ResultadoBusca> {
    const palavras = semAcento(termo).split(/\s+/).filter(Boolean);
    const artigos = ARTIGOS_MOCK.filter((a) => {
      const alvo = semAcento(`${a.titulo} ${a.veiculo ?? ''}`);
      return palavras.some((p) => alvo.includes(p));
    }).map(({ abnt, abntHtml, ...artigo }): ArtigoEncontrado => artigo);

    return of({
      total: artigos.length,
      pagina,
      artigos: pagina === 1 ? artigos : [],
    }).pipe(delay(500));
  }

  override porDoi(doi: string): Observable<ReferenciaFormatada> {
    const artigo = this.encontrar(doi);
    return artigo
      ? of(artigo).pipe(delay(400))
      : throwError(() => new Error('DOI não encontrado'));
  }

  override listarDoProjeto(projetoId: string): Observable<Referencia[]> {
    return this.referencias$.pipe(
      map((todas) =>
        todas
          .filter((r) => r.projetoId === projetoId)
          .sort((a, b) => a.abnt.localeCompare(b.abnt, 'pt-BR')),
      ),
    );
  }

  override adicionar(projetoId: string, doi: string): Observable<Referencia> {
    const artigo = this.encontrar(doi);
    if (!artigo?.doi) {
      return throwError(() => new Error('DOI não encontrado'));
    }

    const id = artigo.doi.toLowerCase();
    if (this.referencias$.value.some((r) => r.projetoId === projetoId && r.id === id)) {
      return throwError(
        () => new Error('essa referência já está na lista do projeto'),
      );
    }

    const referencia: Referencia = {
      id,
      projetoId,
      doi: artigo.doi,
      titulo: artigo.titulo,
      ano: artigo.ano,
      abnt: artigo.abnt,
      abntHtml: artigo.abntHtml,
      adicionadaPor: this.auth.usuario()?.nome ?? '',
      adicionadaEm: new Date().toISOString(),
    };
    this.referencias$.next([...this.referencias$.value, referencia]);
    return of(referencia).pipe(delay(300));
  }

  override remover(projetoId: string, referenciaId: string): Observable<void> {
    this.referencias$.next(
      this.referencias$.value.filter(
        (r) => !(r.projetoId === projetoId && r.id === referenciaId),
      ),
    );
    return of(undefined).pipe(delay(200));
  }

  private encontrar(doi: string): ReferenciaFormatada | undefined {
    const alvo = doi
      .trim()
      .toLowerCase()
      .replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/, '');
    return ARTIGOS_MOCK.find((a) => a.doi?.toLowerCase() === alvo);
  }
}

/* -------------------------------------------------------------------------- */
/*                                    http                                    */
/* -------------------------------------------------------------------------- */

@Injectable()
export class ReferenciaHttpService extends ReferenciaService {
  private readonly http = inject(HttpClient);

  override buscar(termo: string, pagina = 1): Observable<ResultadoBusca> {
    return this.http
      .get<ResultadoBusca>(`${environment.apiBaseUrl}/referencias/busca`, {
        params: { q: termo, pagina },
      })
      .pipe(catchError(erroHttp));
  }

  /** DOI vai na query porque tem "/" — não cabe num segmento de path. */
  override porDoi(doi: string): Observable<ReferenciaFormatada> {
    return this.http
      .get<ReferenciaFormatada>(`${environment.apiBaseUrl}/referencias/doi`, {
        params: { doi },
      })
      .pipe(catchError(erroHttp));
  }

  override listarDoProjeto(projetoId: string): Observable<Referencia[]> {
    return this.http
      .get<Referencia[]>(
        `${environment.apiBaseUrl}/projetos/${projetoId}/referencias`,
      )
      .pipe(catchError(erroHttp));
  }

  override adicionar(projetoId: string, doi: string): Observable<Referencia> {
    return this.http
      .post<Referencia>(
        `${environment.apiBaseUrl}/projetos/${projetoId}/referencias`,
        { doi },
      )
      .pipe(catchError(erroHttp));
  }

  override remover(projetoId: string, referenciaId: string): Observable<void> {
    return this.http
      .delete(
        `${environment.apiBaseUrl}/projetos/${projetoId}/referencias/${referenciaId}`,
      )
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }
}
