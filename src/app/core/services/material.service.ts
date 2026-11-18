import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Material, NewMaterial, UploadEvent } from '../models';
import { toApiError } from './http-error';
import { UploadTicket, uploadToBucket } from './upload';

// Serviço
export abstract class MaterialService {
  // Listagem
  abstract list(): Observable<Material[]>;
  // Criação
  abstract create(material: NewMaterial): Observable<Material>;
  // Exclusão
  abstract remove(materialId: string): Observable<void>;
  // Upload
  abstract uploadFile(file: File): Observable<UploadEvent>;
  // Link
  abstract fileLink(materialId: string): Observable<{ url: string; nome: string }>;
}

// Serviço
@Injectable()
export class MaterialHttpService extends MaterialService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/materiais`;
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  // Listagem
  override list(): Observable<Material[]> {
    return this.reload$.pipe(
      switchMap(() => this.http.get<Material[]>(this.url).pipe(catchError(toApiError))),
    );
  }

  // Criação
  override create(material: NewMaterial): Observable<Material> {
    return this.http.post<Material>(this.url, material).pipe(
      tap(() => this.reload$.next()),
      catchError(toApiError),
    );
  }

  // Exclusão
  override remove(materialId: string): Observable<void> {
    return this.http.delete(`${this.url}/${materialId}`).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // Upload
  override uploadFile(file: File): Observable<UploadEvent> {
    return this.http
      .post<UploadTicket>(`${this.url}/arquivos`, { nome: file.name, tamanho: file.size })
      .pipe(
        catchError(toApiError),
        switchMap((ticket) => uploadToBucket(this.http, ticket, file)),
      );
  }

  // Link
  override fileLink(materialId: string): Observable<{ url: string; nome: string }> {
    return this.http
      .get<{ url: string; nome: string }>(`${this.url}/${materialId}/arquivo`)
      .pipe(catchError(toApiError));
  }
}
