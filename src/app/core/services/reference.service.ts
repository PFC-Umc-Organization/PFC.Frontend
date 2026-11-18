import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FormattedReference, Reference, SearchResult } from '../models';
import { toApiError } from './http-error';

// Serviço
export abstract class ReferenceService {
  // Busca
  abstract search(term: string, page?: number): Observable<SearchResult>;
  // Por DOI
  abstract byDoi(doi: string): Observable<FormattedReference>;
  // Por projeto
  abstract ofProject(projectId: string): Observable<Reference[]>;
  // Inclusão
  abstract add(projectId: string, doi: string): Observable<Reference>;
  // Exclusão
  abstract remove(projectId: string, referenceId: string): Observable<void>;
  /** Corrects the reference by its DOI; the backend fetches the work again and rebuilds the ABNT. */
  abstract replace(projectId: string, referenceId: string, doi: string): Observable<Reference>;
}

// Serviço
@Injectable()
export class ReferenceHttpService extends ReferenceService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // Busca
  override search(term: string, page = 1): Observable<SearchResult> {
    return this.http
      .get<SearchResult>(`${this.base}/referencias/busca`, { params: { q: term, pagina: page } })
      .pipe(catchError(toApiError));
  }

  // Por DOI
  override byDoi(doi: string): Observable<FormattedReference> {
    return this.http
      .get<FormattedReference>(`${this.base}/referencias/doi`, { params: { doi } })
      .pipe(catchError(toApiError));
  }

  // Por projeto
  override ofProject(projectId: string): Observable<Reference[]> {
    return this.http
      .get<Reference[]>(`${this.base}/projetos/${projectId}/referencias`)
      .pipe(catchError(toApiError));
  }

  // Inclusão
  override add(projectId: string, doi: string): Observable<Reference> {
    return this.http
      .post<Reference>(`${this.base}/projetos/${projectId}/referencias`, { doi })
      .pipe(catchError(toApiError));
  }

<<<<<<< HEAD
  // Exclusão
=======
  override replace(projectId: string, referenceId: string, doi: string): Observable<Reference> {
    return this.http
      .put<Reference>(`${this.base}/projetos/${projectId}/referencias/${referenceId}`, { doi })
      .pipe(catchError(toApiError));
  }

>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  override remove(projectId: string, referenceId: string): Observable<void> {
    return this.http.delete(`${this.base}/projetos/${projectId}/referencias/${referenceId}`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
