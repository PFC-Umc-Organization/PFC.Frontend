import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AtualizacaoProjeto,
  MeuPfc,
  NovoProjeto,
  NovoProjetoDoAluno,
  Projeto,
  ProjetoDetalhe,
} from '../models';
import { erroHttp } from './http-erro';
import { ProgramaService } from './programa.service';

export abstract class ProjetoService {
  abstract listar(programaId?: string): Observable<Projeto[]>;
  abstract detalhe(projetoId: string): Observable<ProjetoDetalhe>;
  /** Situação do aluno logado: o grupo dele ou a turma em que pode criar um. */
  abstract meuPfc(): Observable<MeuPfc>;
  abstract meuProjeto(): Observable<Projeto | null>;
  abstract criar(novo: NovoProjeto): Observable<Projeto>;
  /** O aluno logado cria o projeto do próprio grupo (na turma dele). */
  abstract criarDoAluno(novo: NovoProjetoDoAluno): Observable<Projeto>;
  abstract adicionarIntegrante(projetoId: string, rgm: string): Observable<void>;
  abstract removerIntegrante(projetoId: string, rgm: string): Observable<void>;
  abstract atualizar(
    projetoId: string,
    dados: AtualizacaoProjeto,
  ): Observable<void>;
  abstract definirOrientador(
    projetoId: string,
    orientadorId: string,
  ): Observable<void>;
  abstract removerOrientador(projetoId: string): Observable<void>;
  abstract remover(projetoId: string): Observable<void>;
}

@Injectable()
export class ProjetoHttpService extends ProjetoService {
  private readonly http = inject(HttpClient);
  private readonly programaService = inject(ProgramaService);

  override listar(programaId?: string): Observable<Projeto[]> {
    if (programaId) {
      return this.listarPorPrograma(programaId);
    }

    return this.programaService.listar().pipe(
      switchMap((programas) =>
        programas.length
          ? forkJoin(programas.map((p) => this.listarPorPrograma(p.id)))
          : of([] as Projeto[][]),
      ),
      map((listas) => listas.flat()),
    );
  }

  private listarPorPrograma(programaId: string): Observable<Projeto[]> {
    return this.http
      .get<Projeto[]>(
        `${environment.apiBaseUrl}/programas/${programaId}/projetos`,
      )
      .pipe(catchError(erroHttp));
  }

  override detalhe(projetoId: string): Observable<ProjetoDetalhe> {
    return this.http
      .get<ProjetoDetalhe>(`${environment.apiBaseUrl}/projetos/${projetoId}`)
      .pipe(catchError(erroHttp));
  }

  override meuPfc(): Observable<MeuPfc> {
    return this.http
      .get<MeuPfc>(`${environment.apiBaseUrl}/meu-pfc`)
      .pipe(catchError(erroHttp));
  }

  override meuProjeto(): Observable<Projeto | null> {
    return this.meuPfc().pipe(map((m) => m.grupo?.projeto ?? null));
  }

  override criar(novo: NovoProjeto): Observable<Projeto> {
    return this.http
      .post<Projeto>(
        `${environment.apiBaseUrl}/programas/${novo.programaId}/projetos`,
        {
          nome: novo.nome,
          descricao: novo.descricao,
          integrantes: novo.integrantes,
        },
      )
      .pipe(catchError(erroHttp));
  }

  override criarDoAluno(novo: NovoProjetoDoAluno): Observable<Projeto> {
    return this.http
      .post<Projeto>(`${environment.apiBaseUrl}/meu-pfc`, novo)
      .pipe(catchError(erroHttp));
  }

  override adicionarIntegrante(
    projetoId: string,
    rgm: string,
  ): Observable<void> {
    return this.http
      .put(`${environment.apiBaseUrl}/projetos/${projetoId}/integrantes`, {
        rgm,
      })
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }

  override removerIntegrante(
    projetoId: string,
    rgm: string,
  ): Observable<void> {
    return this.http
      .request(
        'DELETE',
        `${environment.apiBaseUrl}/projetos/${projetoId}/integrantes`,
        { body: { rgm } },
      )
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }

  override definirOrientador(
    projetoId: string,
    orientadorId: string,
  ): Observable<void> {
    return this.http
      .put(`${environment.apiBaseUrl}/projetos/${projetoId}/orientador`, {
        orientadorId,
      })
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }

  override atualizar(
    projetoId: string,
    dados: AtualizacaoProjeto,
  ): Observable<void> {
    return this.http
      .put(`${environment.apiBaseUrl}/projetos/${projetoId}`, dados)
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }

  override removerOrientador(projetoId: string): Observable<void> {
    return this.http
      .delete(`${environment.apiBaseUrl}/projetos/${projetoId}/orientador`)
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }

  override remover(projetoId: string): Observable<void> {
    return this.http
      .delete(`${environment.apiBaseUrl}/projetos/${projetoId}`)
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }
}
