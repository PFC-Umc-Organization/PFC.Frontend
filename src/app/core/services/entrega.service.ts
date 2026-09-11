import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, delay, map, of } from 'rxjs';

import { Atividade, ItemTimeline, LinhaStatusProjeto } from '../models';
import { MemoriaStore } from './memoria.store';

/** Matriz projeto × atividade da visão geral do curso. */
export interface MatrizStatus {
  atividades: Atividade[];
  linhas: LinhaStatusProjeto[];
}

export abstract class EntregaService {
  /** Timeline de um grupo: as atividades do cronograma com o status do projeto. */
  abstract timelineDoProjeto(projetoId: string): Observable<ItemTimeline[]>;
  /** Atalho para a visão do aluno — resolve o projeto do grupo dele. */
  abstract timelineDoAluno(alunoId: string): Observable<ItemTimeline[]>;
  abstract matrizDoCurso(cursoId: string): Observable<MatrizStatus>;
  abstract marcarEntregue(
    atividadeId: string,
    projetoId: string,
  ): Observable<void>;
  abstract desfazerEntrega(
    atividadeId: string,
    projetoId: string,
  ): Observable<void>;
}

@Injectable()
export class EntregaMockService extends EntregaService {
  private readonly store = inject(MemoriaStore);

  /**
   * O cronograma é o mesmo para todo mundo, então a timeline lista TODAS as
   * atividades — o que varia de projeto para projeto é só o status.
   */
  override timelineDoProjeto(projetoId: string): Observable<ItemTimeline[]> {
    return combineLatest([
      this.store.atividades,
      this.store.entregas,
      this.store.projetos,
    ]).pipe(
      map(([atividades]) =>
        atividades
          .slice()
          .sort((a, b) => a.prazo.localeCompare(b.prazo))
          .map<ItemTimeline>((atividade) => ({
            atividadeId: atividade.id,
            titulo: atividade.titulo,
            projetoNome: this.store.nomeProjeto(projetoId),
            prazo: atividade.prazo,
            status: this.store.statusEntrega(atividade, projetoId),
          })),
      ),
    );
  }

  override timelineDoAluno(alunoId: string): Observable<ItemTimeline[]> {
    return combineLatest([
      this.store.atividades,
      this.store.entregas,
      this.store.projetos,
      this.store.usuarios,
    ]).pipe(
      map(([atividades]) => {
        const projeto = this.store.projetoDoAluno(alunoId);

        if (!projeto) {
          return [];
        }

        return atividades
          .slice()
          .sort((a, b) => a.prazo.localeCompare(b.prazo))
          .map<ItemTimeline>((atividade) => ({
            atividadeId: atividade.id,
            titulo: atividade.titulo,
            projetoNome: projeto.nome,
            prazo: atividade.prazo,
            status: this.store.statusEntrega(atividade, projeto.id),
          }));
      }),
    );
  }

  override matrizDoCurso(cursoId: string): Observable<MatrizStatus> {
    return combineLatest([
      this.store.atividades,
      this.store.entregas,
      this.store.projetos,
    ]).pipe(
      map(([atividades]) => {
        const cronograma = atividades
          .slice()
          .sort((a, b) => a.prazo.localeCompare(b.prazo));

        const linhas = this.store
          .projetosDoCurso(cursoId)
          .map<LinhaStatusProjeto>((projeto) => ({
            projeto: { id: projeto.id, nome: projeto.nome },
            celulas: cronograma.map((atividade) => ({
              atividadeId: atividade.id,
              status: this.store.statusEntrega(atividade, projeto.id),
            })),
          }));

        return { atividades: cronograma, linhas };
      }),
    );
  }

  override marcarEntregue(
    atividadeId: string,
    projetoId: string,
  ): Observable<void> {
    this.store.definirEntrega(atividadeId, projetoId, new Date().toISOString());
    return of(undefined).pipe(delay(200));
  }

  override desfazerEntrega(
    atividadeId: string,
    projetoId: string,
  ): Observable<void> {
    this.store.definirEntrega(atividadeId, projetoId, null);
    return of(undefined).pipe(delay(200));
  }
}
