import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Convite, Projeto } from '../models';
import { erroHttp } from './http-erro';

/**
 * Convites de integrante (atividade 8). Quem cria o PFC entra sozinho; os
 * colegas recebem convite e só viram integrantes ao aceitar. Sem SES, o
 * convite aparece no app (tela Meu PFC).
 */
export abstract class ConviteService {
  /** Convites recebidos pelo aluno logado. */
  abstract meusConvites(): Observable<Convite[]>;
  /** Entra no grupo; devolve o projeto já com o aluno em `integrantes`. */
  abstract aceitar(projetoId: string): Observable<Projeto>;
  abstract recusar(projetoId: string): Observable<void>;
  /** Convites ainda sem resposta do grupo. */
  abstract doGrupo(projetoId: string): Observable<Convite[]>;
  abstract convidar(projetoId: string, rgm: string): Observable<Convite>;
  abstract cancelar(projetoId: string, rgm: string): Observable<void>;
}

@Injectable()
export class ConviteHttpService extends ConviteService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  override meusConvites(): Observable<Convite[]> {
    return this.http
      .get<Convite[]>(`${this.base}/meus-convites`)
      .pipe(catchError(erroHttp));
  }

  override aceitar(projetoId: string): Observable<Projeto> {
    return this.http
      .post<Projeto>(`${this.base}/meus-convites/${projetoId}/aceitar`, {})
      .pipe(catchError(erroHttp));
  }

  override recusar(projetoId: string): Observable<void> {
    return this.http
      .post(`${this.base}/meus-convites/${projetoId}/recusar`, {})
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }

  override doGrupo(projetoId: string): Observable<Convite[]> {
    return this.http
      .get<Convite[]>(`${this.base}/projetos/${projetoId}/convites`)
      .pipe(catchError(erroHttp));
  }

  override convidar(projetoId: string, rgm: string): Observable<Convite> {
    return this.http
      .post<Convite>(`${this.base}/projetos/${projetoId}/convites`, { rgm })
      .pipe(catchError(erroHttp));
  }

  override cancelar(projetoId: string, rgm: string): Observable<void> {
    return this.http
      .delete(`${this.base}/projetos/${projetoId}/convites/${encodeURIComponent(rgm)}`)
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }
}
