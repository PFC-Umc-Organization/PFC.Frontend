import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, delay, map, of } from 'rxjs';

import { Atividade, ItemTimeline, LinhaStatusProjeto } from '../models';
import { MemoriaStore } from './memoria.store';

export interface MatrizStatus {
  atividades: Atividade[];
  linhas: LinhaStatusProjeto[];
}

export abstract class EntregaService {
  
  abstract timelineDoProjeto(projetoId: string): Observable<ItemTimeline[]>;
  abstract timelineDoAluno(rgm: string): Observable<ItemTimeline[]>;
  abstract matrizDoCurso(cursoId: string): Observable<MatrizStatus>;
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
