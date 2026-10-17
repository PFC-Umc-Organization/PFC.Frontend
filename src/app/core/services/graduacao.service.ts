import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, delay, map, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Graduacao } from '../models';
import { erroHttp } from './http-erro';

/** Cursos cadastrados (GET/POST/PUT/DELETE /cursos). */
export abstract class GraduacaoService {
  abstract listar(): Observable<Graduacao[]>;
  abstract criar(nome: string): Observable<Graduacao>;
  /** Renomear leva as turmas do curso junto. */
  abstract atualizar(id: string, nome: string): Observable<void>;
  /** O backend recusa (409) se o curso ainda tiver turmas. */
  abstract remover(id: string): Observable<void>;
}

@Injectable()
export class GraduacaoMockService extends GraduacaoService {
  private readonly cursos$ = new BehaviorSubject<Graduacao[]>([
    { id: 'g-eng', nome: 'Engenharia de Software' },
    { id: 'g-si', nome: 'Sistemas de Informação' },
  ]);

  override listar(): Observable<Graduacao[]> {
    return this.cursos$.asObservable();
  }

  override criar(nome: string): Observable<Graduacao> {
    const curso = { id: `g-${crypto.randomUUID()}`, nome: nome.trim() };
    this.cursos$.next([...this.cursos$.value, curso]);
    return of(curso).pipe(delay(300));
  }

  override atualizar(id: string, nome: string): Observable<void> {
    if (!this.cursos$.value.some((c) => c.id === id)) {
      return throwError(() => new Error('Curso não encontrado.'));
    }
    this.cursos$.next(
      this.cursos$.value.map((c) => (c.id === id ? { ...c, nome: nome.trim() } : c)),
    );
    return of(undefined).pipe(delay(300));
  }

  override remover(id: string): Observable<void> {
    this.cursos$.next(this.cursos$.value.filter((c) => c.id !== id));
    return of(undefined).pipe(delay(300));
  }
}

@Injectable()
export class GraduacaoHttpService extends GraduacaoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/cursos`;

  override listar(): Observable<Graduacao[]> {
    return this.http.get<Graduacao[]>(this.url).pipe(catchError(erroHttp));
  }

  override criar(nome: string): Observable<Graduacao> {
    return this.http.post<Graduacao>(this.url, { nome }).pipe(catchError(erroHttp));
  }

  override atualizar(id: string, nome: string): Observable<void> {
    return this.http.put(`${this.url}/${id}`, { nome }).pipe(
      map(() => undefined),
      catchError(erroHttp),
    );
  }

  override remover(id: string): Observable<void> {
    return this.http.delete(`${this.url}/${id}`).pipe(
      map(() => undefined),
      catchError(erroHttp),
    );
  }
}
