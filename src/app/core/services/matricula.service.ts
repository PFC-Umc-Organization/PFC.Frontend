import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Matricula, ResultadoMatricula } from '../models';
import { erroHttp } from './http-erro';

export abstract class MatriculaService {
  abstract listar(): Observable<Matricula[]>;
  abstract provisionar(
    rgms: string[],
    turmaId: string,
  ): Observable<ResultadoMatricula>;
  abstract remover(rgms: string[]): Observable<ResultadoMatricula>;
}

@Injectable()
export class MatriculaHttpService extends MatriculaService {
  private readonly http = inject(HttpClient);

  override listar(): Observable<Matricula[]> {
    return this.http
      .get<Matricula[]>(`${environment.apiBaseUrl}/admin/students`)
      .pipe(catchError(erroHttp));
  }

  override provisionar(
    rgms: string[],
    turmaId: string,
  ): Observable<ResultadoMatricula> {
    return this.http
      .post<ResultadoMatricula>(`${environment.apiBaseUrl}/admin/students`, {
        rgms,
        turmaId,
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
