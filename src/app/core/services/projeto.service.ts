import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';

import { Projeto, ProjetoDetalhe } from '../models';
import { MemoriaStore } from './memoria.store';

export abstract class ProjetoService {
  /** Sem `cursoId`, devolve os projetos de todos os cursos. */
  abstract listar(cursoId?: string): Observable<Projeto[]>;
  abstract detalhe(projetoId: string): Observable<ProjetoDetalhe | null>;
  /** Projeto do grupo a que o aluno pertence. */
  abstract doAluno(alunoId: string): Observable<Projeto | null>;
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
}
