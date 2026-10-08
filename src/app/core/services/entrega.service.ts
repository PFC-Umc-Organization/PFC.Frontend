import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  delay,
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
import { MemoriaStore } from './memoria.store';
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

  override entregar(
    atividadeId: string,
    projetoId: string,
    respostas: RespostasEntrega,
  ): Observable<void> {
    const atividade = this.store.atividadesAtuais.find(
      (a) => a.id === atividadeId,
    );
    this.store.definirEntrega(atividadeId, projetoId, new Date().toISOString(), {
      arquivoNome: atividade && arquivoDaEntrega(atividade, respostas),
      respostas,
    });
    return of(undefined).pipe(delay(300));
  }
}

@Injectable()
export class EntregaHttpService extends EntregaService {
  private readonly http = inject(HttpClient);
  private readonly atividades = inject(AtividadeService);
  private readonly projetos = inject(ProjetoService);
  private readonly recarregar$ = new BehaviorSubject<void>(undefined);

  private entregasDoProjeto(projetoId: string): Observable<Entrega[]> {
    return this.recarregar$.pipe(
      switchMap(() =>
        this.http
          .get<Entrega[]>(
            `${environment.apiBaseUrl}/projetos/${projetoId}/entregas`,
          )
          .pipe(catchError(() => of([] as Entrega[]))),
      ),
    );
  }

  private entregasDaAtividade(atividadeId: string): Observable<Entrega[]> {
    return this.http
      .get<Entrega[]>(
        `${environment.apiBaseUrl}/atividades/${atividadeId}/entregas`,
      )
      .pipe(catchError(() => of([] as Entrega[])));
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
