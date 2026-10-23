import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Invitation, Project } from '../models';
import { toApiError } from './http-error';

/**
 * Classmates join a group by accepting an invitation. There is no e-mail:
 * invitations show up in the app (Meu PFC).
 */
export abstract class InvitationService {
  /** Invitations received by the signed-in student. */
  abstract mine(): Observable<Invitation[]>;
  /** Returns the project with the student among `integrantes`. */
  abstract accept(projectId: string): Observable<Project>;
  abstract decline(projectId: string): Observable<void>;
  abstract ofProject(projectId: string): Observable<Invitation[]>;
  abstract invite(projectId: string, rgm: string): Observable<Invitation>;
  abstract cancel(projectId: string, rgm: string): Observable<void>;
}

@Injectable()
export class InvitationHttpService extends InvitationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  override mine(): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${this.base}/meus-convites`).pipe(catchError(toApiError));
  }

  override accept(projectId: string): Observable<Project> {
    return this.http
      .post<Project>(`${this.base}/meus-convites/${projectId}/aceitar`, {})
      .pipe(catchError(toApiError));
  }

  override decline(projectId: string): Observable<void> {
    return this.http.post(`${this.base}/meus-convites/${projectId}/recusar`, {}).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override ofProject(projectId: string): Observable<Invitation[]> {
    return this.http
      .get<Invitation[]>(`${this.base}/projetos/${projectId}/convites`)
      .pipe(catchError(toApiError));
  }

  override invite(projectId: string, rgm: string): Observable<Invitation> {
    return this.http
      .post<Invitation>(`${this.base}/projetos/${projectId}/convites`, { rgm })
      .pipe(catchError(toApiError));
  }

  override cancel(projectId: string, rgm: string): Observable<void> {
    return this.http
      .delete(`${this.base}/projetos/${projectId}/convites/${encodeURIComponent(rgm)}`)
      .pipe(
        map(() => undefined),
        catchError(toApiError),
      );
  }
}
