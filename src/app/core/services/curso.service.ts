import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AtualizarCurso, Curso, NovoCurso } from '../models';
import { erroHttp } from './http-erro';
import { MemoriaStore } from './memoria.store';

/** Contrato consumido pelos componentes. Trocar a implementação = trocar o provider. */
export abstract class CursoService {
  abstract listar(): Observable<Curso[]>;
  abstract criar(novo: NovoCurso): Observable<Curso>;
  abstract atualizar(cursoId: string, dados: AtualizarCurso): Observable<void>;
  /** Backend recusa (409) se a turma ainda tiver Programa vinculado. */
  abstract remover(cursoId: string): Observable<void>;
}

@Injectable()
export class CursoMockService extends CursoService {
  private readonly store = inject(MemoriaStore);

  override listar(): Observable<Curso[]> {
    return this.store.cursos;
  }

  override criar(novo: NovoCurso): Observable<Curso> {
    const curso: Curso = { id: `c-${crypto.randomUUID()}`, ...novo };
    this.store.adicionarCurso(curso);
    return of(curso).pipe(delay(300));
  }

  override atualizar(cursoId: string, dados: AtualizarCurso): Observable<void> {
    this.store.atualizarCurso(cursoId, dados);
    return of(undefined).pipe(delay(300));
  }

  override remover(cursoId: string): Observable<void> {
    this.store.removerCurso(cursoId);
    return of(undefined).pipe(delay(300));
  }
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
