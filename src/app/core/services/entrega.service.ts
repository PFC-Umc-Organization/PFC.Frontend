import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, delay, map, of } from 'rxjs';

import {
  Atividade,
  ItemTimeline,
  LinhaStatusProjeto,
  Projeto,
} from '../models';
import { MemoriaStore } from './memoria.store';

export interface MatrizStatus {
  atividades: Atividade[];
  linhas: LinhaStatusProjeto[];
}

export abstract class EntregaService {
  
  /** `projetoNome` evita depender do mock pra achar o nome de um projeto real. */
  abstract timelineDoProjeto(
    projetoId: string,
    projetoNome?: string,
  ): Observable<ItemTimeline[]>;
  abstract timelineDoAluno(rgm: string): Observable<ItemTimeline[]>;
  /**
   * Matriz projeto × atividade. Recebe os projetos prontos (os reais,
   * vindos do ProjetoService) em vez de buscá-los — assim as linhas nunca
   * saem dos projetos de exemplo do mock.
   */
  abstract matrizDosProjetos(
    projetos: Pick<Projeto, 'id' | 'nome'>[],
  ): Observable<MatrizStatus>;
  abstract marcarEntregue(
    atividadeId: string,
    projetoId: string,
  ): Observable<void>;
  abstract desfazerEntrega(
    atividadeId: string,
    projetoId: string,
  ): Observable<void>;
  abstract entregar(
    atividadeId: string,
    projetoId: string,
    arquivo: File,
    observacao?: string,
  ): Observable<void>;
}

@Injectable()
export class EntregaMockService extends EntregaService {
  private readonly store = inject(MemoriaStore);

 
  override timelineDoProjeto(
    projetoId: string,
    projetoNome?: string,
  ): Observable<ItemTimeline[]> {
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
            projetoNome: projetoNome ?? this.store.nomeProjeto(projetoId),
            prazo: atividade.prazo,
            status: this.store.statusEntrega(atividade, projetoId),
            arquivoNome: this.store.arquivoEntrega(atividade.id, projetoId),
          })),
      ),
    );
  }

  override timelineDoAluno(rgm: string): Observable<ItemTimeline[]> {
    return combineLatest([
      this.store.atividades,
      this.store.entregas,
      this.store.projetos,
      this.store.usuarios,
    ]).pipe(
      map(([atividades]) => {
        const projeto = this.store.projetoDoAluno(rgm);

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
            arquivoNome: this.store.arquivoEntrega(atividade.id, projeto.id),
          }));
      }),
    );
  }

  override matrizDosProjetos(
    projetos: Pick<Projeto, 'id' | 'nome'>[],
  ): Observable<MatrizStatus> {
    return combineLatest([this.store.atividades, this.store.entregas]).pipe(
      map(([atividades]) => {
        const cronograma = atividades
          .slice()
          .sort((a, b) => a.prazo.localeCompare(b.prazo));

        const linhas = projetos
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

  override entregar(
    atividadeId: string,
    projetoId: string,
    arquivo: File,
    observacao?: string,
  ): Observable<void> {
    this.store.definirEntrega(atividadeId, projetoId, new Date().toISOString(), {
      arquivoNome: arquivo.name,
      observacao,
    });
    return of(undefined).pipe(delay(300));
  }
}
