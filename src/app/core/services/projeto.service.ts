import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  combineLatest,
  delay,
  forkJoin,
  map,
  of,
  switchMap,
  throwError,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AtualizacaoProjeto,
  NovoProjeto,
  Projeto,
  ProjetoDetalhe,
  rotuloCurso,
} from '../models';
import { CursoService } from './curso.service';
import { erroHttp } from './http-erro';
import { MemoriaStore } from './memoria.store';
import { ProgramaService } from './programa.service';
import { UsuarioService } from './usuario.service';

export abstract class ProjetoService {
  /** Sem `programaId`, devolve os projetos de todos os programas. */
  abstract listar(programaId?: string): Observable<Projeto[]>;
  abstract detalhe(projetoId: string): Observable<ProjetoDetalhe | null>;
  /** Projeto do grupo a que o aluno pertence, pelo RGM dele. */
  abstract doAluno(rgm: string): Observable<Projeto | null>;
  /** Cadastro do PFC — restrito ao coordenador de PFC. */
  abstract criar(novo: NovoProjeto): Observable<Projeto>;
  /** Adiciona um aluno (pelo RGM) ao grupo — restrito ao coordenador. */
  abstract adicionarIntegrante(projetoId: string, rgm: string): Observable<void>;
  /** Remove um aluno (pelo RGM) do grupo — restrito ao coordenador. */
  abstract removerIntegrante(projetoId: string, rgm: string): Observable<void>;
  /** Edição feita pelo coordenador na Gestão de PFC (nome/descrição). */
  abstract atualizar(
    projetoId: string,
    dados: AtualizacaoProjeto,
  ): Observable<void>;
  abstract definirOrientador(
    projetoId: string,
    orientadorId: string,
  ): Observable<void>;
  /** Limpa o orientador do PFC, sem excluir o grupo. */
  abstract removerOrientador(projetoId: string): Observable<void>;
  abstract remover(projetoId: string): Observable<void>;
}

@Injectable()
export class ProjetoMockService extends ProjetoService {
  private readonly store = inject(MemoriaStore);

  override listar(programaId?: string): Observable<Projeto[]> {
    return this.store.projetos.pipe(
      map((projetos) =>
        (programaId
          ? projetos.filter((p) => p.programaId === programaId)
          : projetos
        )
          .slice()
          .sort((a, b) => a.nome.localeCompare(b.nome)),
      ),
    );
  }

  /**
   * Depende de usuários além de projetos: se um integrante se cadastrar
   * (ganhando nome) ou um orientador for renomeado, o detalhe reflete na
   * hora.
   */
  override detalhe(projetoId: string): Observable<ProjetoDetalhe | null> {
    return combineLatest([
      this.store.projetos,
      this.store.usuarios,
      this.store.cursos,
      this.store.programas,
    ]).pipe(
      map(([projetos]) => {
        const projeto = projetos.find((p) => p.id === projetoId);

        if (!projeto) {
          return null;
        }

        const programa = this.store.programasAtuais.find(
          (p) => p.id === projeto.programaId,
        );
        const orientador = projeto.orientadorId
          ? this.store.usuariosAtuais.find(
              (u) => u.id === projeto.orientadorId,
            )
          : undefined;

        return {
          projeto,
          cursoNome: this.store.nomeCurso(programa?.cursoId ?? null),
          integrantes: this.store.integrantesDoProjeto(projeto.id),
          orientador: orientador
            ? { id: orientador.id, nome: orientador.nome }
            : null,
        };
      }),
    );
  }

  override doAluno(rgm: string): Observable<Projeto | null> {
    return combineLatest([this.store.projetos, this.store.usuarios]).pipe(
      map(() => this.store.projetoDoAluno(rgm) ?? null),
    );
  }

  override criar(novo: NovoProjeto): Observable<Projeto> {
    const projeto: Projeto = {
      id: `p-${crypto.randomUUID()}`,
      nome: novo.nome.trim(),
      descricao: novo.descricao.trim(),
      programaId: novo.programaId,
      integrantes: novo.integrantes,
    };

    this.store.adicionarProjeto(projeto);
    return of(projeto).pipe(delay(400));
  }

  override adicionarIntegrante(projetoId: string, rgm: string): Observable<void> {
    if (this.store.projetoDoAluno(rgm)) {
      return throwError(
        () => new Error('Esse RGM já faz parte de um grupo.'),
      ).pipe(delay(250));
    }

    this.store.adicionarIntegranteAoProjeto(projetoId, rgm);
    return of(undefined).pipe(delay(300));
  }

  override removerIntegrante(projetoId: string, rgm: string): Observable<void> {
    this.store.removerIntegranteDoProjeto(projetoId, rgm);
    return of(undefined).pipe(delay(300));
  }

  override atualizar(
    projetoId: string,
    dados: AtualizacaoProjeto,
  ): Observable<void> {
    this.store.atualizarProjeto(projetoId, dados);
    return of(undefined).pipe(delay(300));
  }

  override definirOrientador(
    projetoId: string,
    orientadorId: string,
  ): Observable<void> {
    this.store.definirOrientador(projetoId, orientadorId);
    return of(undefined).pipe(delay(300));
  }

  override removerOrientador(projetoId: string): Observable<void> {
    this.store.definirOrientador(projetoId, null);
    return of(undefined).pipe(delay(300));
  }

  override remover(projetoId: string): Observable<void> {
    this.store.removerProjeto(projetoId);
    return of(undefined).pipe(delay(300));
  }
}

/**
 * `listar`, `criar`, `adicionarIntegrante`, `removerIntegrante` e
 * `definirOrientador` falam com o backend de verdade.
 *
 * `detalhe` e `doAluno` não têm endpoint próprio (não existe "buscar um
 * projeto" nem "achar o projeto de um RGM") — são resolvidos no cliente,
 * agregando `listar()` sobre todos os programas.
 *
 * `atualizar`, `removerOrientador` e `remover` ainda não têm rota no
 * backend (ver README, "Gaps conhecidos") — falham com um erro explícito
 * em vez de escrever silenciosamente num store que ninguém mais lê.
 */
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
      this.usuarioService.listar(),
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

  override atualizar(): Observable<void> {
    return throwError(
      () => new Error('Editar PFC ainda não está disponível no backend.'),
    );
  }

  override removerOrientador(): Observable<void> {
    return throwError(
      () =>
        new Error('Remover orientador ainda não está disponível no backend.'),
    );
  }

  override remover(): Observable<void> {
    return throwError(
      () => new Error('Excluir PFC ainda não está disponível no backend.'),
    );
  }
}
