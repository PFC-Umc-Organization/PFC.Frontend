import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Atividade,
  Entrega,
  ItemTimeline,
  LinhaStatusProjeto,
  Projeto,
  RespostasEntrega,
} from '../models';
import { AtividadeService } from './atividade.service';
import { erroHttp } from './http-erro';
import { ProjetoService } from './projeto.service';
import { arquivoDaEntrega, statusDaEntrega } from './status-entrega';

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
  /** Entregas do grupo (com as respostas), atualizada a cada envio/remoção. */
  abstract entregasDoProjeto(projetoId: string): Observable<Entrega[]>;
  /** Apaga a entrega do grupo — o orientador devolve a atividade pra refazer. */
  abstract remover(projetoId: string, atividadeId: string): Observable<void>;
  /**
   * Entrega (ou reenvia) o formulário do grupo. `respostas` é indexado pelo
   * id do campo; em campo de arquivo vai o nome do arquivo escolhido.
   */
  abstract entregar(
    atividadeId: string,
    projetoId: string,
    respostas: RespostasEntrega,
  ): Observable<void>;
}

@Injectable()
export class EntregaHttpService extends EntregaService {
  private readonly http = inject(HttpClient);
  private readonly atividades = inject(AtividadeService);
  private readonly projetos = inject(ProjetoService);
  private readonly recarregar$ = new BehaviorSubject<void>(undefined);

  override entregasDoProjeto(projetoId: string): Observable<Entrega[]> {
    return this.recarregar$.pipe(
      switchMap(() =>
        this.http
          .get<Entrega[]>(
            `${environment.apiBaseUrl}/projetos/${projetoId}/entregas`,
          )
          .pipe(catchError(erroHttp)),
      ),
    );
  }

  private entregasDaAtividade(atividadeId: string): Observable<Entrega[]> {
    return this.http
      .get<Entrega[]>(
        `${environment.apiBaseUrl}/atividades/${atividadeId}/entregas`,
      )
      .pipe(catchError(erroHttp));
  }

  override timelineDoProjeto(
    projetoId: string,
    projetoNome = '',
  ): Observable<ItemTimeline[]> {
    return combineLatest([
      this.atividades.listar(),
      this.entregasDoProjeto(projetoId),
    ]).pipe(
      map(([atividades, entregas]) =>
        atividades.map<ItemTimeline>((atividade) => {
          const entrega = entregas.find((e) => e.atividadeId === atividade.id);
          return {
            atividadeId: atividade.id,
            titulo: atividade.titulo,
            projetoNome,
            prazo: atividade.prazo,
            status: statusDaEntrega(atividade.prazo, entrega?.entregueEm),
            arquivoNome: arquivoDaEntrega(atividade, entrega?.respostas),
          };
        }),
      ),
    );
  }

  override timelineDoAluno(rgm: string): Observable<ItemTimeline[]> {
    return this.projetos
      .doAluno(rgm)
      .pipe(
        switchMap((p) =>
          p ? this.timelineDoProjeto(p.id, p.nome) : of([] as ItemTimeline[]),
        ),
      );
  }

  override matrizDosProjetos(
    projetos: Pick<Projeto, 'id' | 'nome'>[],
  ): Observable<MatrizStatus> {
    return this.recarregar$.pipe(
      switchMap(() => this.atividades.listar()),
      switchMap((atividades) =>
        (atividades.length === 0
          ? of([] as Entrega[][])
          : forkJoin(atividades.map((a) => this.entregasDaAtividade(a.id)))
        ).pipe(
          map((porAtividade) => ({
            atividades,
            linhas: projetos.map<LinhaStatusProjeto>((projeto) => ({
              projeto: { id: projeto.id, nome: projeto.nome },
              celulas: atividades.map((atividade, i) => ({
                atividadeId: atividade.id,
                status: statusDaEntrega(
                  atividade.prazo,
                  porAtividade[i].find((e) => e.projetoId === projeto.id)
                    ?.entregueEm,
                ),
              })),
            })),
          })),
        ),
      ),
    );
  }

  override remover(projetoId: string, atividadeId: string): Observable<void> {
    return this.http
      .delete(
        `${environment.apiBaseUrl}/projetos/${projetoId}/entregas/${atividadeId}`,
      )
      .pipe(
        tap(() => this.recarregar$.next()),
        map(() => undefined),
        catchError(erroHttp),
      );
  }

  override entregar(
    atividadeId: string,
    projetoId: string,
    respostas: RespostasEntrega,
  ): Observable<void> {
    return this.http
      .put(
        `${environment.apiBaseUrl}/projetos/${projetoId}/entregas/${atividadeId}`,
        { respostas },
      )
      .pipe(
        tap(() => this.recarregar$.next()),
        map(() => undefined),
        catchError(erroHttp),
      );
  }
}
