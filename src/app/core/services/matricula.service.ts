import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Matricula, ResultadoMatricula } from '../models';
import { erroHttp } from './http-erro';
import { MemoriaStore } from './memoria.store';

/**
 * Espelha o domínio `matricula` do backend: pré-autoriza RGMs em lote pra
 * que o aluno possa se autocadastrar depois. NÃO cria uma conta — isso só
 * acontece quando o próprio aluno se registra e o RGM embutido no e-mail
 * bate com essa allowlist.
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

/** `listar`/`provisionar`/`remover` falam com o backend de verdade. */
@Injectable()
export class MatriculaHttpService extends MatriculaService {
  private readonly http = inject(HttpClient);

  override listar(): Observable<Matricula[]> {
    return this.http
      .get<Matricula[]>(`${environment.apiBaseUrl}/admin/students`)
      .pipe(catchError(erroHttp));
  }

  override provisionar(rgms: string[]): Observable<ResultadoMatricula> {
    return this.http
      .post<ResultadoMatricula>(`${environment.apiBaseUrl}/admin/students`, {
        rgms,
      })
      .pipe(catchError(erroHttp));
  }

  override remover(rgms: string[]): Observable<ResultadoMatricula> {
    return this.http
      .request<ResultadoMatricula>(
        'DELETE',
        `${environment.apiBaseUrl}/admin/students`,
        { body: { rgms } },
      )
      .pipe(catchError(erroHttp));
  }
}
