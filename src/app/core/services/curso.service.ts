import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AtualizarCurso, Curso, NovoCurso } from '../models';
import { erroHttp } from './http-erro';

/** Contrato consumido pelos componentes. Trocar a implementação = trocar o provider. */
export abstract class CursoService {
  abstract listar(): Observable<Curso[]>;
  abstract criar(novo: NovoCurso): Observable<Curso>;
  abstract atualizar(cursoId: string, dados: AtualizarCurso): Observable<void>;
  /** Backend recusa (409) se a turma ainda tiver Programa vinculado. */
  abstract remover(cursoId: string): Observable<void>;
}

/** Fala com o backend real — ver `internal/curso` no PFC.Backend. */
@Injectable()
export class CursoHttpService extends CursoService {
  private readonly http = inject(HttpClient);

  override listar(): Observable<Curso[]> {
    return this.http
      .get<Curso[]>(`${environment.apiBaseUrl}/turmas`)
      .pipe(catchError(erroHttp));
  }

  override criar(novo: NovoCurso): Observable<Curso> {
    return this.http
      .post<Curso>(`${environment.apiBaseUrl}/turmas`, novo)
      .pipe(catchError(erroHttp));
  }

  override atualizar(cursoId: string, dados: AtualizarCurso): Observable<void> {
    return this.http
      .put(`${environment.apiBaseUrl}/turmas/${cursoId}`, dados)
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }

  override remover(cursoId: string): Observable<void> {
    return this.http
      .delete(`${environment.apiBaseUrl}/turmas/${cursoId}`)
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }
}
