import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FormattedReference, Reference, SearchResult } from '../models';
import { toApiError } from './http-error';

/**
 * The backend queries OpenAlex (search) and Crossref (DOI metadata) and
 * formats ABNT; the front never calls those APIs.
 */
export abstract class ReferenceService {
  abstract search(term: string, page?: number): Observable<SearchResult>;
  abstract byDoi(doi: string): Observable<FormattedReference>;
  abstract ofProject(projectId: string): Observable<Reference[]>;
  /** Just the DOI: the backend fetches the metadata again. */
  abstract add(projectId: string, doi: string): Observable<Reference>;
  abstract remove(projectId: string, referenceId: string): Observable<void>;
}

@Injectable()
export class ReferenceHttpService extends ReferenceService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  override search(term: string, page = 1): Observable<SearchResult> {
    return this.http
      .get<SearchResult>(`${this.base}/referencias/busca`, { params: { q: term, pagina: page } })
      .pipe(catchError(toApiError));
  }

  /** In the query string: a DOI has "/" and does not fit in a path segment. */
  override byDoi(doi: string): Observable<FormattedReference> {
    return this.http
      .get<FormattedReference>(`${this.base}/referencias/doi`, { params: { doi } })
      .pipe(catchError(toApiError));
  }

  override ofProject(projectId: string): Observable<Reference[]> {
    return this.http
      .get<Reference[]>(`${this.base}/projetos/${projectId}/referencias`)
      .pipe(catchError(toApiError));
  }

  override add(projectId: string, doi: string): Observable<Reference> {
    return this.http
      .post<Reference>(`${this.base}/projetos/${projectId}/referencias`, { doi })
      .pipe(catchError(toApiError));
  }

  override remove(projectId: string, referenceId: string): Observable<void> {
    return this.http.delete(`${this.base}/projetos/${projectId}/referencias/${referenceId}`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
