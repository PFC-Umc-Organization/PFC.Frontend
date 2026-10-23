import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Cohort, CohortUpdate, NewCohort } from '../models';
import { toApiError } from './http-error';

export abstract class CohortService {
  abstract list(): Observable<Cohort[]>;
  abstract create(cohort: NewCohort): Observable<Cohort>;
  abstract update(cohortId: string, changes: CohortUpdate): Observable<void>;
  /** The backend refuses (409) while the cohort has a program. */
  abstract remove(cohortId: string): Observable<void>;
}

@Injectable()
export class CohortHttpService extends CohortService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/turmas`;

  override list(): Observable<Cohort[]> {
    return this.http.get<Cohort[]>(this.url).pipe(catchError(toApiError));
  }

  override create(cohort: NewCohort): Observable<Cohort> {
    return this.http.post<Cohort>(this.url, cohort).pipe(catchError(toApiError));
  }

  override update(cohortId: string, changes: CohortUpdate): Observable<void> {
    return this.http.put(`${this.url}/${cohortId}`, changes).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override remove(cohortId: string): Observable<void> {
    return this.http.delete(`${this.url}/${cohortId}`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
