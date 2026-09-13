import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Matricula, ResultadoMatricula } from '../models';
import { erroHttp } from './http-erro';
import { MemoriaStore } from './memoria.store';

/**
 * Espelha o domínio `matricula` do backend: pré-autoriza RGMs em lote pra
 * que o aluno possa se autocadastrar depois. NÃO cria uma conta — isso só
 * acontece quando o próprio aluno se registra e o RGM embutido no e-mail
 * bate com essa allowlist.
 *
 * Hoje não existe endpoint de listagem no backend (`GET /admin/students`) —
 * `listar()` aqui é só uma conveniência do mock pra tela conseguir mostrar
 * o que já foi pré-autorizado.
 */
export abstract class MatriculaService {
  abstract listar(): Observable<Matricula[]>;
  abstract provisionar(rgms: string[]): Observable<ResultadoMatricula>;
  abstract remover(rgms: string[]): Observable<ResultadoMatricula>;
}

@Injectable()
export class MatriculaMockService extends MatriculaService {
  protected readonly store = inject(MemoriaStore);

  override listar(): Observable<Matricula[]> {
    return this.store.matriculas;
  }

  override provisionar(rgms: string[]): Observable<ResultadoMatricula> {
    this.store.provisionarMatriculas(rgms);
    return of({ processados: rgms.length, falhas: [] }).pipe(delay(400));
  }

  override remover(rgms: string[]): Observable<ResultadoMatricula> {
    this.store.removerMatriculas(rgms);
    return of({ processados: rgms.length, falhas: [] }).pipe(delay(300));
  }
}

/**
 * `provisionar`/`remover` gravam de verdade no backend (allowlist no
 * DynamoDB). Não existe `GET /admin/students` ainda, então `listar()`
 * continua herdado do mock — para a lista não ficar completamente vazia
 * depois de uma operação real, espelhamos o resultado no store local
 * também (efeito colateral só de UI, não é fonte de verdade).
 */
@Injectable()
export class MatriculaHttpService extends MatriculaMockService {
  private readonly http = inject(HttpClient);

  override provisionar(rgms: string[]): Observable<ResultadoMatricula> {
    return this.http
      .post<ResultadoMatricula>(`${environment.apiBaseUrl}/admin/students`, {
        rgms,
      })
      .pipe(
        tap(() => this.store.provisionarMatriculas(rgms)),
        catchError(erroHttp),
      );
  }

  override remover(rgms: string[]): Observable<ResultadoMatricula> {
    return this.http
      .request<ResultadoMatricula>(
        'DELETE',
        `${environment.apiBaseUrl}/admin/students`,
        { body: { rgms } },
      )
      .pipe(
        tap(() => this.store.removerMatriculas(rgms)),
        catchError(erroHttp),
      );
  }
}
