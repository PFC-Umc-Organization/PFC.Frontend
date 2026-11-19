import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Announcement, NewAnnouncement } from '../models';
import { toApiError } from './http-error';

// Serviço
export abstract class AnnouncementService {
  // Listagem
  abstract list(): Observable<Announcement[]>;
  // Criação
  abstract create(announcement: NewAnnouncement): Observable<Announcement>;
  // Exclusão
  abstract remove(announcementId: string): Observable<void>;
}

// Serviço
@Injectable()
export class AnnouncementHttpService extends AnnouncementService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/avisos`;
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  // Listagem
  override list(): Observable<Announcement[]> {
    return this.reload$.pipe(
      switchMap(() => this.http.get<Announcement[]>(this.url).pipe(catchError(toApiError))),
      // Newest first; a missing date sorts last instead of breaking the list.
      map((items) => [...items].sort((a, b) => (b.criadoEm ?? '').localeCompare(a.criadoEm ?? ''))),
    );
  }

  // Criação
  override create(announcement: NewAnnouncement): Observable<Announcement> {
    return this.http.post<Announcement>(this.url, announcement).pipe(
      tap(() => this.reload$.next()),
      catchError(toApiError),
    );
  }

  // Exclusão
  override remove(announcementId: string): Observable<void> {
    return this.http.delete(`${this.url}/${announcementId}`).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
