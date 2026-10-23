import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  map,
  switchMap,
  tap,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Atividade,
  EnvioArquivo,
  Entrega,
  ItemTimeline,
  LinhaStatusProjeto,
  RespostasEntrega,
} from '../models';
import { AtividadeService } from './atividade.service';
import { erroHttp } from './http-erro';
import { ProjetoService } from './projeto.service';
import { TicketArquivo, enviarParaBucket } from './upload';
import { arquivoDaEntrega, statusDaEntrega } from './status-entrega';

export interface MatrizStatus {
  atividades: Atividade[];
  linhas: LinhaStatusProjeto[];
  /** Entregas com as respostas: o detalhe da célula sai daqui, sem nova chamada. */
  entregas: Entrega[];
}

export abstract class EntregaService {
  
  /** `projetoNome` evita depender do mock pra achar o nome de um projeto real. */
  abstract timelineDoProjeto(
    projetoId: string,
    projetoNome?: string,
  ): Observable<ItemTimeline[]>;
  /**
   * Matriz projeto × atividade do programa: projetos, atividades e entregas
   * buscados em paralelo (uma chamada cada). Atualiza a cada remoção.
   */
  abstract matriz(programaId: string): Observable<MatrizStatus>;
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
  /**
   * Envia o arquivo direto para o bucket, com o progresso; no fim emite a
   * chave, que vira a resposta do campo. `status` 503 no erro = o backend
   * ainda não tem bucket.
   */
  abstract enviarArquivo(
    projetoId: string,
    atividadeId: string,
    campoId: string,
    arquivo: File,
  ): Observable<EnvioArquivo>;
  /** Link de download (vale 5 minutos). */
  abstract linkDoArquivo(
    projetoId: string,
    atividadeId: string,
    campoId: string,
  ): Observable<{ url: string; nome: string }>;
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

  override matriz(programaId: string): Observable<MatrizStatus> {
    const entregas$ = this.recarregar$.pipe(
      switchMap(() =>
        this.http
          .get<Entrega[]>(
            `${environment.apiBaseUrl}/programas/${programaId}/entregas`,
          )
          .pipe(catchError(erroHttp)),
      ),
    );
    return combineLatest([
      this.projetos.listar(programaId),
      this.atividades.listar(),
      entregas$,
    ]).pipe(
      map(([projetos, atividades, entregas]) => ({
        atividades,
        entregas,
        linhas: projetos.map<LinhaStatusProjeto>((projeto) => ({
          projeto: { id: projeto.id, nome: projeto.nome },
          celulas: atividades.map((atividade) => ({
            atividadeId: atividade.id,
            status: statusDaEntrega(
              atividade.prazo,
              entregas.find(
                (e) => e.projetoId === projeto.id && e.atividadeId === atividade.id,
              )?.entregueEm,
            ),
          })),
        })),
      })),
    );
  }

  override enviarArquivo(
    projetoId: string,
    atividadeId: string,
    campoId: string,
    arquivo: File,
  ): Observable<EnvioArquivo> {
    return this.http
      .post<TicketArquivo>(
        `${environment.apiBaseUrl}/projetos/${projetoId}/entregas/${atividadeId}/arquivos`,
        { campoId, nome: arquivo.name, tamanho: arquivo.size },
      )
      .pipe(
        catchError(erroHttp),
        switchMap((ticket) => enviarParaBucket(this.http, ticket, arquivo)),
      );
  }

  override linkDoArquivo(
    projetoId: string,
    atividadeId: string,
    campoId: string,
  ): Observable<{ url: string; nome: string }> {
    return this.http
      .get<{ url: string; nome: string }>(
        `${environment.apiBaseUrl}/projetos/${projetoId}/entregas/${atividadeId}/arquivos/${campoId}`,
      )
      .pipe(catchError(erroHttp));
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
