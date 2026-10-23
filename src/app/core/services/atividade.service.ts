import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Atividade,
  AtualizacaoAtividade,
  CampoEntrega,
  NovaAtividade,
  NovoCampoEntrega,
} from '../models';
import { erroHttp } from './http-erro';

export abstract class AtividadeService {
  abstract listar(): Observable<Atividade[]>;
  abstract criar(nova: NovaAtividade): Observable<Atividade>;
  abstract atualizar(
    atividadeId: string,
    dados: AtualizacaoAtividade,
  ): Observable<Atividade>;
  abstract remover(atividadeId: string): Observable<void>;
  abstract adicionarCampo(
    atividadeId: string,
    campo: NovoCampoEntrega,
  ): Observable<CampoEntrega>;
  /** Falha se for o último campo — toda atividade precisa de ao menos um. */
  abstract removerCampo(atividadeId: string, campoId: string): Observable<void>;
}

@Injectable()
export class AtividadeHttpService extends AtividadeService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/atividades`;

  /** Emite a cada alteração pra que as listas abertas se atualizem. */
  private readonly recarregar$ = new BehaviorSubject<void>(undefined);

  override listar(): Observable<Atividade[]> {
    return this.recarregar$.pipe(
      switchMap(() =>
        this.http
          .get<Atividade[]>(this.url)
          .pipe(catchError(erroHttp)),
      ),
    );
  }

  override criar(nova: NovaAtividade): Observable<Atividade> {
    return this.http.post<Atividade>(this.url, nova).pipe(
      tap(() => this.recarregar$.next()),
      catchError(erroHttp),
    );
  }

  override atualizar(
    atividadeId: string,
    dados: AtualizacaoAtividade,
  ): Observable<Atividade> {
    return this.http.put<Atividade>(`${this.url}/${atividadeId}`, dados).pipe(
      tap(() => this.recarregar$.next()),
      catchError(erroHttp),
    );
  }

  override remover(atividadeId: string): Observable<void> {
    return this.http.delete(`${this.url}/${atividadeId}`).pipe(
      tap(() => this.recarregar$.next()),
      map(() => undefined),
      catchError(erroHttp),
    );
  }

  override adicionarCampo(
    atividadeId: string,
    campo: NovoCampoEntrega,
  ): Observable<CampoEntrega> {
    return this.http
      .post<CampoEntrega>(`${this.url}/${atividadeId}/campos`, campo)
      .pipe(
        tap(() => this.recarregar$.next()),
        catchError(erroHttp),
      );
  }

  override removerCampo(atividadeId: string, campoId: string): Observable<void> {
    return this.http
      .delete(`${this.url}/${atividadeId}/campos/${campoId}`)
      .pipe(
        tap(() => this.recarregar$.next()),
        map(() => undefined),
        catchError(erroHttp),
      );
  }
}
