import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Activity, ActivityUpdate, Field, NewActivity, NewField } from '../models';
import { toApiError } from './http-error';

export abstract class ActivityService {
  /** Emits again after every change. */
  abstract list(): Observable<Activity[]>;
  abstract create(activity: NewActivity): Observable<Activity>;
  abstract update(activityId: string, changes: ActivityUpdate): Observable<Activity>;
  abstract remove(activityId: string): Observable<void>;
  abstract addField(activityId: string, field: NewField): Observable<Field>;
  /** Fails on the last field: every activity needs one. */
  abstract removeField(activityId: string, fieldId: string): Observable<void>;
}

@Injectable()
export class ActivityHttpService extends ActivityService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/atividades`;
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  override list(): Observable<Activity[]> {
    return this.reload$.pipe(
      switchMap(() => this.http.get<Activity[]>(this.url).pipe(catchError(toApiError))),
    );
  }

  override create(activity: NewActivity): Observable<Activity> {
    return this.http.post<Activity>(this.url, activity).pipe(
      tap(() => this.reload$.next()),
      catchError(toApiError),
    );
  }

  override update(activityId: string, changes: ActivityUpdate): Observable<Activity> {
    return this.http.put<Activity>(`${this.url}/${activityId}`, changes).pipe(
      tap(() => this.reload$.next()),
      catchError(toApiError),
    );
  }

  override remove(activityId: string): Observable<void> {
    return this.http.delete(`${this.url}/${activityId}`).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override addField(activityId: string, field: NewField): Observable<Field> {
    return this.http.post<Field>(`${this.url}/${activityId}/campos`, field).pipe(
      tap(() => this.reload$.next()),
      catchError(toApiError),
    );
  }

  override removeField(activityId: string, fieldId: string): Observable<void> {
    return this.http.delete(`${this.url}/${activityId}/campos/${fieldId}`).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
