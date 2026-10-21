import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Graduacao } from '../models';
import { erroHttp } from './http-erro';

/** Cursos cadastrados (GET/POST/PUT/DELETE /cursos). */
export abstract class GraduacaoService {
  abstract listar(): Observable<Graduacao[]>;
  abstract criar(nome: string): Observable<Graduacao>;
  /** Renomear leva as turmas do curso junto. */
  abstract atualizar(id: string, nome: string): Observable<void>;
  /** O backend recusa (409) se o curso ainda tiver turmas. */
  abstract remover(id: string): Observable<void>;
}

@Injectable()
export class GraduacaoHttpService extends GraduacaoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/cursos`;

  override listar(): Observable<Graduacao[]> {
    return this.http.get<Graduacao[]>(this.url).pipe(catchError(erroHttp));
  }

  override criar(nome: string): Observable<Graduacao> {
    return this.http.post<Graduacao>(this.url, { nome }).pipe(catchError(erroHttp));
  }

  override atualizar(id: string, nome: string): Observable<void> {
    return this.http.put(`${this.url}/${id}`, { nome }).pipe(
      map(() => undefined),
      catchError(erroHttp),
    );
  }

  override remover(id: string): Observable<void> {
    return this.http.delete(`${this.url}/${id}`).pipe(
      map(() => undefined),
      catchError(erroHttp),
    );
  }
}
