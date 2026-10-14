import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, delay, map, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Convite, Projeto, rgmDoUsuario } from '../models';
import { AuthService } from './auth.service';
import { erroHttp } from './http-erro';
import { MemoriaStore } from './memoria.store';

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
export class ConviteMockService extends ConviteService {
  private readonly store = inject(MemoriaStore);
  private readonly auth = inject(AuthService);
  private readonly convites = new BehaviorSubject<Convite[]>([]);

  private meuRgm(): string {
    return rgmDoUsuario(this.auth.usuario());
  }

  override meusConvites(): Observable<Convite[]> {
    return this.convites.pipe(
      map((lista) => lista.filter((c) => c.rgm === this.meuRgm())),
    );
  }

  override aceitar(projetoId: string): Observable<Projeto> {
    const rgm = this.meuRgm();
    const projeto = this.store.projetosAtuais.find((p) => p.id === projetoId);
    if (!projeto || !this.convites.value.some((c) => c.projetoId === projetoId && c.rgm === rgm)) {
      return throwError(() => new Error('Convite não encontrado.'));
    }
    if (this.store.projetoDoAluno(rgm)) {
      return throwError(() => new Error('Você já faz parte de um projeto.'));
    }
    this.store.adicionarIntegranteAoProjeto(projetoId, rgm);
    this.convites.next(this.convites.value.filter((c) => c.rgm !== rgm));
    return of({ ...projeto, integrantes: [...projeto.integrantes, rgm] }).pipe(delay(300));
  }

  override recusar(projetoId: string): Observable<void> {
    return this.cancelar(projetoId, this.meuRgm());
  }

  override doGrupo(projetoId: string): Observable<Convite[]> {
    return this.convites.pipe(
      map((lista) => lista.filter((c) => c.projetoId === projetoId)),
    );
  }

  override convidar(projetoId: string, rgm: string): Observable<Convite> {
    if (this.convites.value.some((c) => c.projetoId === projetoId && c.rgm === rgm)) {
      return throwError(() => new Error(`O RGM ${rgm} já tem um convite deste grupo.`));
    }
    const convite: Convite = {
      projetoId,
      projetoNome: this.store.projetosAtuais.find((p) => p.id === projetoId)?.nome ?? '',
      rgm,
      convidadoPor: this.auth.usuario()?.nome ?? '',
      criadoEm: new Date().toISOString(),
    };
    this.convites.next([...this.convites.value, convite]);
    return of(convite).pipe(delay(300));
  }

  override cancelar(projetoId: string, rgm: string): Observable<void> {
    const antes = this.convites.value.length;
    this.convites.next(
      this.convites.value.filter((c) => !(c.projetoId === projetoId && c.rgm === rgm)),
    );
    if (this.convites.value.length === antes) {
      return throwError(() => new Error('Convite não encontrado.'));
    }
    return of(undefined).pipe(delay(250));
  }
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
