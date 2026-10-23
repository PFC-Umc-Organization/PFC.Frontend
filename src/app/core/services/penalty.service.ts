import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NewPenalty, ProjectPenalties } from '../models';
import { toApiError } from './http-error';
import { SubmissionService } from './submission.service';

export abstract class PenaltyService {
  /** Refreshes after every penalty change, submit and removal. */
  abstract ofProject(projectId: string): Observable<ProjectPenalties>;
  /** Every project of the program the viewer follows. */
  abstract ofProgram(programId: string): Observable<ProjectPenalties[]>;
  abstract apply(projectId: string, penalty: NewPenalty): Observable<ProjectPenalties>;
  abstract waive(projectId: string, penaltyId: string, reason: string): Observable<ProjectPenalties>;
}

@Injectable()
export class PenaltyHttpService extends PenaltyService {
  private readonly http = inject(HttpClient);
  private readonly submissions = inject(SubmissionService);
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly api = environment.apiBaseUrl;

  private refreshing<T>(fetch: () => Observable<T>): Observable<T> {
    return combineLatest([this.reload$, this.submissions.changes()]).pipe(
      switchMap(() => fetch().pipe(catchError(toApiError))),
    );
  }

  override ofProject(projectId: string): Observable<ProjectPenalties> {
    return this.refreshing(() => this.http.get<ProjectPenalties>(`${this.api}/projetos/${projectId}/penalidades`));
  }

  override ofProgram(programId: string): Observable<ProjectPenalties[]> {
    return this.refreshing(() => this.http.get<ProjectPenalties[]>(`${this.api}/programas/${programId}/penalidades`));
  }

  override apply(projectId: string, penalty: NewPenalty): Observable<ProjectPenalties> {
    return this.http.post<ProjectPenalties>(`${this.api}/projetos/${projectId}/penalidades`, penalty).pipe(
      tap(() => this.reload$.next()),
      catchError(toApiError),
    );
  }

  override waive(projectId: string, penaltyId: string, reason: string): Observable<ProjectPenalties> {
    return this.http
      .post<ProjectPenalties>(`${this.api}/projetos/${projectId}/penalidades/${penaltyId}/perdao`, { motivo: reason })
      .pipe(
        tap(() => this.reload$.next()),
        catchError(toApiError),
      );
  }
}
