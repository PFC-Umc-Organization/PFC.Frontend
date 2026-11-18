import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Invitation, Project } from '../models';
import { toApiError } from './http-error';

// Serviço
export abstract class InvitationService {
  // ---------------------------------------------------------------------------
  // Recebidos
  // ---------------------------------------------------------------------------

  // Consulta
  abstract mine(): Observable<Invitation[]>;
  // Aceite
  abstract accept(projectId: string): Observable<Project>;
  // Recusa
  abstract decline(projectId: string): Observable<void>;

  // ---------------------------------------------------------------------------
  // Enviados
  // ---------------------------------------------------------------------------

  // Consulta
  abstract ofProject(projectId: string): Observable<Invitation[]>;
  // Convite
  abstract invite(projectId: string, rgm: string): Observable<Invitation>;
  // Cancelamento
  abstract cancel(projectId: string, rgm: string): Observable<void>;
}

// Serviço
@Injectable()
export class InvitationHttpService extends InvitationService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // ---------------------------------------------------------------------------
  // Recebidos
  // ---------------------------------------------------------------------------

  // Consulta
  override mine(): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${this.base}/meus-convites`).pipe(catchError(toApiError));
  }

  // Aceite
  override accept(projectId: string): Observable<Project> {
    return this.http
      .post<Project>(`${this.base}/meus-convites/${projectId}/aceitar`, {})
      .pipe(catchError(toApiError));
  }

  // Recusa
  override decline(projectId: string): Observable<void> {
    return this.http.post(`${this.base}/meus-convites/${projectId}/recusar`, {}).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // ---------------------------------------------------------------------------
  // Enviados
  // ---------------------------------------------------------------------------

  // Consulta
  override ofProject(projectId: string): Observable<Invitation[]> {
    return this.http
      .get<Invitation[]>(`${this.base}/projetos/${projectId}/convites`)
      .pipe(catchError(toApiError));
  }

  // Convite
  override invite(projectId: string, rgm: string): Observable<Invitation> {
    return this.http
      .post<Invitation>(`${this.base}/projetos/${projectId}/convites`, { rgm })
      .pipe(catchError(toApiError));
  }

  // Cancelamento
  override cancel(projectId: string, rgm: string): Observable<void> {
    return this.http
      .delete(`${this.base}/projetos/${projectId}/convites/${encodeURIComponent(rgm)}`)
      .pipe(
        map(() => undefined),
        catchError(toApiError),
      );
  }
}
