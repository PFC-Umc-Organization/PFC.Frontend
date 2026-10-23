import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { EnvioArquivo, Material, NovoMaterial } from '../models';
import { erroHttp } from './http-erro';
import { TicketArquivo, enviarParaBucket } from './upload';

export abstract class MaterialService {
  /** O backend já filtra: o aluno recebe os gerais e os da turma dele. */
  abstract listar(): Observable<Material[]>;
  abstract criar(novo: NovoMaterial): Observable<Material>;
  abstract remover(materialId: string): Observable<void>;
  /** Envia o arquivo direto para o bucket; no fim emite a chave para `criar`. */
  abstract enviarArquivo(arquivo: File): Observable<EnvioArquivo>;
  /** Link de download (vale 5 minutos). */
  abstract linkDoArquivo(materialId: string): Observable<{ url: string; nome: string }>;
}

@Injectable()
export class MaterialHttpService extends MaterialService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/materiais`;
  private readonly recarregar$ = new BehaviorSubject<void>(undefined);

  override listar(): Observable<Material[]> {
    return this.recarregar$.pipe(
      switchMap(() => this.http.get<Material[]>(this.url).pipe(catchError(erroHttp))),
    );
  }

  override criar(novo: NovoMaterial): Observable<Material> {
    return this.http.post<Material>(this.url, novo).pipe(
      tap(() => this.recarregar$.next()),
      catchError(erroHttp),
    );
  }

  override remover(materialId: string): Observable<void> {
    return this.http.delete(`${this.url}/${materialId}`).pipe(
      tap(() => this.recarregar$.next()),
      map(() => undefined),
      catchError(erroHttp),
    );
  }

  override enviarArquivo(arquivo: File): Observable<EnvioArquivo> {
    return this.http
      .post<TicketArquivo>(`${this.url}/arquivos`, { nome: arquivo.name, tamanho: arquivo.size })
      .pipe(
        catchError(erroHttp),
        switchMap((ticket) => enviarParaBucket(this.http, ticket, arquivo)),
      );
  }

  override linkDoArquivo(materialId: string): Observable<{ url: string; nome: string }> {
    return this.http
      .get<{ url: string; nome: string }>(`${this.url}/${materialId}/arquivo`)
      .pipe(catchError(erroHttp));
  }
}
