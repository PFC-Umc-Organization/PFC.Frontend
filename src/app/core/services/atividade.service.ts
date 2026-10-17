import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  delay,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Atividade,
  AtualizacaoAtividade,
  CAMPO_ENTREGA_PADRAO,
  CampoEntrega,
  NovaAtividade,
  NovoCampoEntrega,
} from '../models';
import { erroHttp } from './http-erro';
import { MemoriaStore } from './memoria.store';

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
export class AtividadeMockService extends AtividadeService {
  private readonly store = inject(MemoriaStore);

  override listar(): Observable<Atividade[]> {
    return this.store.atividades.pipe(
      map((atividades) =>
        atividades.slice().sort((a, b) => a.prazo.localeCompare(b.prazo)),
      ),
    );
  }


  override criar(nova: NovaAtividade): Observable<Atividade> {
    const atividade: Atividade = {
      id: `a-${crypto.randomUUID()}`,
      titulo: nova.titulo.trim(),
      descricao: nova.descricao.trim(),
      prazo: nova.prazo,
      publicadaEm: new Date().toISOString(),
      campos: (nova.campos?.length ? nova.campos : [CAMPO_ENTREGA_PADRAO]).map(
        (c) => ({ ...c, rotulo: c.rotulo.trim(), id: `c-${crypto.randomUUID()}` }),
      ),
    };

    this.store.adicionarAtividade(atividade);
    return of(atividade).pipe(delay(400));
  }

  override atualizar(
    atividadeId: string,
    dados: AtualizacaoAtividade,
  ): Observable<Atividade> {
    this.store.atualizarAtividade(atividadeId, dados);
    const atividade = this.store.atividadesAtuais.find(
      (a) => a.id === atividadeId,
    );

    if (!atividade) {
      return throwError(() => new Error('Atividade não encontrada.'));
    }

    return of(atividade).pipe(delay(300));
  }

  override remover(atividadeId: string): Observable<void> {
    this.store.removerAtividade(atividadeId);
    return of(undefined).pipe(delay(200));
  }

  override adicionarCampo(
    atividadeId: string,
    campo: NovoCampoEntrega,
  ): Observable<CampoEntrega> {
    const rotulo = campo.rotulo.trim();
    if (!rotulo) {
      return throwError(() => new Error('Informe o nome do campo.'));
    }
    if (!this.store.atividadesAtuais.some((a) => a.id === atividadeId)) {
      return throwError(() => new Error('Atividade não encontrada.'));
    }

    const novo: CampoEntrega = { ...campo, rotulo, id: `c-${crypto.randomUUID()}` };
    this.store.adicionarCampoEntrega(atividadeId, novo);
    return of(novo).pipe(delay(200));
  }

  override removerCampo(
    atividadeId: string,
    campoId: string,
  ): Observable<void> {
    const atividade = this.store.atividadesAtuais.find(
      (a) => a.id === atividadeId,
    );
    if (!atividade) {
      return throwError(() => new Error('Atividade não encontrada.'));
    }
    if (atividade.campos.length <= 1) {
      return throwError(
        () => new Error('A atividade precisa ter ao menos um campo de entrega.'),
      );
    }

    this.store.removerCampoEntrega(atividadeId, campoId);
    return of(undefined).pipe(delay(200));
  }
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
          .pipe(catchError(() => of([] as Atividade[]))),
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
