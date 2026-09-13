import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, delay, map, of, throwError } from 'rxjs';

import {
  Atividade,
  AtividadeResumo,
  AtualizacaoAtividade,
  NovaAtividade,
} from '../models';
import { MemoriaStore } from './memoria.store';

export abstract class AtividadeService {
  abstract listar(): Observable<Atividade[]>;
  /**
   * Resumos com os números agregados. Sem `cursoId`, conta os projetos de
   * todos os cursos; com ele, restringe a contagem àquele curso.
   */
  abstract listarResumos(cursoId?: string): Observable<AtividadeResumo[]>;
  abstract criar(nova: NovaAtividade): Observable<Atividade>;
  /** Edita uma atividade já publicada (título, descrição e/ou prazo). */
  abstract atualizar(
    atividadeId: string,
    dados: AtualizacaoAtividade,
  ): Observable<Atividade>;
  abstract remover(atividadeId: string): Observable<void>;
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

  /**
   * Depende de entregas e projetos, por isso o combineLatest — qualquer
   * mudança nessas coleções recalcula a lista.
   */
  override listarResumos(cursoId?: string): Observable<AtividadeResumo[]> {
    return combineLatest([
      this.listar(),
      this.store.entregas,
      this.store.projetos,
    ]).pipe(
      map(([atividades]) =>
        atividades.map<AtividadeResumo>((atividade) => ({
          atividade,
          projetosEntregues: this.store.entregasRecebidas(atividade.id, cursoId),
          totalProjetos: this.store.totalProjetos(cursoId),
          status: this.store.statusAtividade(atividade, cursoId),
        })),
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
}
