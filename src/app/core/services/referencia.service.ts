import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Referencia, ReferenciaFormatada, ResultadoBusca } from '../models';
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
