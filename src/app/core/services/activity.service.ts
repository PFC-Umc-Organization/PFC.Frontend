import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Activity, ActivityUpdate, Field, NewActivity, NewField } from '../models';
import { toApiError } from './http-error';

// Serviço
export abstract class ActivityService {
  // Listagem
  abstract list(): Observable<Activity[]>;
  // Criação
  abstract create(activity: NewActivity): Observable<Activity>;
  // Atualização
  abstract update(activityId: string, changes: ActivityUpdate): Observable<Activity>;
  // Exclusão
  abstract remove(activityId: string): Observable<void>;
  // Inclusão
  abstract addField(activityId: string, field: NewField): Observable<Field>;
  // Remoção
  abstract removeField(activityId: string, fieldId: string): Observable<void>;
}

// Serviço
@Injectable()
export class ActivityHttpService extends ActivityService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/atividades`;
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  // Listagem
  override list(): Observable<Activity[]> {
    return this.reload$.pipe(
      switchMap(() => this.http.get<Activity[]>(this.url).pipe(catchError(toApiError))),
    );
  }

  // Criação
  override create(activity: NewActivity): Observable<Activity> {
    return this.http.post<Activity>(this.url, activity).pipe(
      tap(() => this.reload$.next()),
      catchError(toApiError),
    );
  }

  // Atualização
  override update(activityId: string, changes: ActivityUpdate): Observable<Activity> {
    return this.http.put<Activity>(`${this.url}/${activityId}`, changes).pipe(
      tap(() => this.reload$.next()),
      catchError(toApiError),
    );
  }

  // Exclusão
  override remove(activityId: string): Observable<void> {
    return this.http.delete(`${this.url}/${activityId}`).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // Inclusão
  override addField(activityId: string, field: NewField): Observable<Field> {
    return this.http.post<Field>(`${this.url}/${activityId}/campos`, field).pipe(
      tap(() => this.reload$.next()),
      catchError(toApiError),
    );
  }

  // Remoção
  override removeField(activityId: string, fieldId: string): Observable<void> {
    return this.http.delete(`${this.url}/${activityId}/campos/${fieldId}`).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
