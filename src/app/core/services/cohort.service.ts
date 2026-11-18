import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Cohort, CohortUpdate, NewCohort } from '../models';
import { toApiError } from './http-error';

// Serviço
export abstract class CohortService {
  // Listagem
  abstract list(): Observable<Cohort[]>;
  // Criação
  abstract create(cohort: NewCohort): Observable<Cohort>;
  // Atualização
  abstract update(cohortId: string, changes: CohortUpdate): Observable<void>;
  // Exclusão
  abstract remove(cohortId: string): Observable<void>;
}

// Serviço
@Injectable()
export class CohortHttpService extends CohortService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/turmas`;

  // Listagem
  override list(): Observable<Cohort[]> {
    return this.http.get<Cohort[]>(this.url).pipe(catchError(toApiError));
  }

  // Criação
  override create(cohort: NewCohort): Observable<Cohort> {
    return this.http.post<Cohort>(this.url, cohort).pipe(catchError(toApiError));
  }

  // Atualização
  override update(cohortId: string, changes: CohortUpdate): Observable<void> {
    return this.http.put(`${this.url}/${cohortId}`, changes).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // Exclusão
  override remove(cohortId: string): Observable<void> {
    return this.http.delete(`${this.url}/${cohortId}`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
