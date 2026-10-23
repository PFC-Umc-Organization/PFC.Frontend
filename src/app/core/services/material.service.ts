import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Material, NewMaterial, UploadEvent } from '../models';
import { toApiError } from './http-error';
import { UploadTicket, uploadToBucket } from './upload';

export abstract class MaterialService {
  /** Already filtered by the backend: a student gets the general ones and their cohort's. */
  abstract list(): Observable<Material[]>;
  abstract create(material: NewMaterial): Observable<Material>;
  abstract remove(materialId: string): Observable<void>;
  /** Uploads straight to the bucket; ends with the key to pass to `create`. */
  abstract uploadFile(file: File): Observable<UploadEvent>;
  /** A download link valid for 5 minutes. */
  abstract fileLink(materialId: string): Observable<{ url: string; nome: string }>;
}

@Injectable()
export class MaterialHttpService extends MaterialService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/materiais`;
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  override list(): Observable<Material[]> {
    return this.reload$.pipe(
      switchMap(() => this.http.get<Material[]>(this.url).pipe(catchError(toApiError))),
    );
  }

  override create(material: NewMaterial): Observable<Material> {
    return this.http.post<Material>(this.url, material).pipe(
      tap(() => this.reload$.next()),
      catchError(toApiError),
    );
  }

  override remove(materialId: string): Observable<void> {
    return this.http.delete(`${this.url}/${materialId}`).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override uploadFile(file: File): Observable<UploadEvent> {
    return this.http
      .post<UploadTicket>(`${this.url}/arquivos`, { nome: file.name, tamanho: file.size })
      .pipe(
        catchError(toApiError),
        switchMap((ticket) => uploadToBucket(this.http, ticket, file)),
      );
  }

  override fileLink(materialId: string): Observable<{ url: string; nome: string }> {
    return this.http
      .get<{ url: string; nome: string }>(`${this.url}/${materialId}/arquivo`)
      .pipe(catchError(toApiError));
  }
}
