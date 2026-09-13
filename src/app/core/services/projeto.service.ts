import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, delay, map, of, throwError } from 'rxjs';

import { NovoProjeto, Projeto, ProjetoDetalhe } from '../models';
import { MemoriaStore } from './memoria.store';

export abstract class ProjetoService {
  /** Sem `cursoId`, devolve os projetos de todos os cursos. */
  abstract listar(cursoId?: string): Observable<Projeto[]>;
  abstract detalhe(projetoId: string): Observable<ProjetoDetalhe | null>;
  /** Projeto do grupo a que o aluno pertence. */
  abstract doAluno(alunoId: string): Observable<Projeto | null>;
  /** Cadastro do PFC pelo aluno — só é permitido uma vez por grupo. */
  abstract criar(novo: NovoProjeto): Observable<Projeto>;
  /** Adiciona um colega (já cadastrado pelo professor) ao grupo. */
  abstract adicionarIntegrante(
    projetoId: string,
    alunoId: string,
  ): Observable<Projeto>;
}

@Injectable()
export class ProjetoMockService extends ProjetoService {
  private readonly store = inject(MemoriaStore);

  override listar(cursoId?: string): Observable<Projeto[]> {
    return this.store.projetos.pipe(
      map((projetos) =>
        (cursoId ? projetos.filter((p) => p.cursoId === cursoId) : projetos)
          .slice()
          .sort((a, b) => a.nome.localeCompare(b.nome)),
      ),
    );
  }

  /**
   * Depende de usuários além de projetos: se um integrante for renomeado ou
   * desativado, o detalhe precisa refletir isso na hora.
   */
  override detalhe(projetoId: string): Observable<ProjetoDetalhe | null> {
    return combineLatest([
      this.store.projetos,
      this.store.usuarios,
      this.store.cursos,
    ]).pipe(
      map(([projetos]) => {
        const projeto = projetos.find((p) => p.id === projetoId);

        if (!projeto) {
          return null;
        }

        return {
          projeto,
          cursoNome: this.store.nomeCurso(projeto.cursoId),
          integrantes: this.store
            .integrantesDoProjeto(projeto.id)
            .map((u) => ({ id: u.id, nome: u.nome, email: u.email })),
        };
      }),
    );
  }

  override doAluno(alunoId: string): Observable<Projeto | null> {
    return combineLatest([this.store.projetos, this.store.usuarios]).pipe(
      map(() => this.store.projetoDoAluno(alunoId) ?? null),
    );
  }

  override criar(novo: NovoProjeto): Observable<Projeto> {
    const [alunoId] = novo.integrantes;

    if (alunoId && this.store.projetoDoAluno(alunoId)) {
      return throwError(
        () => new Error('Você já tem um PFC cadastrado.'),
      ).pipe(delay(250));
    }

    const projeto: Projeto = {
      id: `p-${crypto.randomUUID()}`,
      nome: novo.nome.trim(),
      descricao: novo.descricao.trim(),
      cursoId: novo.cursoId,
      integrantes: novo.integrantes,
    };

    this.store.adicionarProjeto(projeto);
    return of(projeto).pipe(delay(400));
  }

  override adicionarIntegrante(
    projetoId: string,
    alunoId: string,
  ): Observable<Projeto> {
    if (this.store.projetoDoAluno(alunoId)) {
      return throwError(
        () => new Error('Esse colega já faz parte de um grupo.'),
      ).pipe(delay(250));
    }

    this.store.adicionarIntegranteAoProjeto(projetoId, alunoId);
    const projeto = this.store.projetosAtuais.find((p) => p.id === projetoId);

    if (!projeto) {
      return throwError(() => new Error('Projeto não encontrado.'));
    }

    return of(projeto).pipe(delay(300));
  }
}
