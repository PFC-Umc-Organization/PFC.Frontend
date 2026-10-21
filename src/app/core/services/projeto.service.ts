import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, combineLatest, forkJoin, map, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AtualizacaoProjeto,
  NovoProjeto,
  NovoProjetoDoAluno,
  Projeto,
  ProjetoDetalhe,
  Usuario,
  rotuloCurso,
} from '../models';
import { CursoService } from './curso.service';
import { erroHttp } from './http-erro';
import { ProgramaService } from './programa.service';
import { UsuarioService } from './usuario.service';

export abstract class ProjetoService {
  abstract listar(programaId?: string): Observable<Projeto[]>;
  abstract detalhe(projetoId: string): Observable<ProjetoDetalhe | null>;
  abstract doAluno(rgm: string): Observable<Projeto | null>;
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
  private readonly usuarioService = inject(UsuarioService);
  private readonly cursoService = inject(CursoService);

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

  override detalhe(projetoId: string): Observable<ProjetoDetalhe | null> {
    return combineLatest([
      this.listar(),
      // Sem a lista de usuários o detalhe ainda funciona — só os nomes
      // de integrantes/orientador ficam em branco.
      this.usuarioService.listar().pipe(catchError(() => of([] as Usuario[]))),
      this.programaService.listar(),
      this.cursoService.listar(),
    ]).pipe(
      map(([projetos, usuarios, programas, cursos]) => {
        const projeto = projetos.find((p) => p.id === projetoId);

        if (!projeto) {
          return null;
        }

        const programa = programas.find((p) => p.id === projeto.programaId);
        const curso = programa
          ? cursos.find((c) => c.id === programa.cursoId)
          : undefined;
        const orientador = projeto.orientadorId
          ? usuarios.find((u) => u.id === projeto.orientadorId)
          : undefined;

        return {
          projeto,
          cursoNome: curso ? rotuloCurso(curso) : '—',
          integrantes: projeto.integrantes.map((rgm) => ({
            rgm,
            nome: usuarios.find((u) => u.rgm === rgm)?.nome ?? null,
          })),
          orientador: orientador
            ? { id: orientador.id, nome: orientador.nome }
            : null,
        };
      }),
    );
  }

  override doAluno(rgm: string): Observable<Projeto | null> {
    return this.listar().pipe(
      map((projetos) => projetos.find((p) => p.integrantes.includes(rgm)) ?? null),
    );
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
