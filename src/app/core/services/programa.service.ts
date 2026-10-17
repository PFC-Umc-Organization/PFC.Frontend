import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NovoPrograma, Programa } from '../models';
import { erroHttp } from './http-erro';
import { MemoriaStore } from './memoria.store';


export abstract class ProgramaService {
  abstract listar(): Observable<Programa[]>;
  abstract criar(novo: NovoPrograma): Observable<Programa>;
  /** Passa o programa para outra turma (a única coisa que ele tem pra editar). */
  abstract atualizar(programaId: string, cursoId: string): Observable<void>;
  abstract deletar(programaId: string): Observable<void>;
}

@Injectable()
export class ProgramaMockService extends ProgramaService {
  private readonly store = inject(MemoriaStore);

  override listar(): Observable<Programa[]> {
    return this.store.programas;
  }

  override criar(novo: NovoPrograma): Observable<Programa> {
    const programa: Programa = {
      id: `pr-${crypto.randomUUID()}`,
      cursoId: novo.cursoId,
    };

    this.store.adicionarPrograma(programa);
    return of(programa).pipe(delay(300));
  }

  override atualizar(programaId: string, cursoId: string): Observable<void> {
    this.store.atualizarPrograma(programaId, cursoId);
    return of(undefined).pipe(delay(300));
  }

  override deletar(programaId: string): Observable<void> {
    this.store.removerPrograma(programaId);
    return of(undefined).pipe(delay(300));
  }
}

@Injectable()
export class ProgramaHttpService extends ProgramaService {
  private readonly http = inject(HttpClient);

  override listar(): Observable<Programa[]> {
    return this.http
      .get<Programa[]>(`${environment.apiBaseUrl}/programas`)
      .pipe(catchError(erroHttp));
  }

  override criar(novo: NovoPrograma): Observable<Programa> {
    return this.http
      .post<Programa>(`${environment.apiBaseUrl}/programas`, novo)
      .pipe(catchError(erroHttp));
  }

  override atualizar(programaId: string, cursoId: string): Observable<void> {
    return this.http
      .put(`${environment.apiBaseUrl}/programas/${programaId}`, { cursoId })
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }

  override deletar(programaId: string): Observable<void> {
    return this.http
      .delete(`${environment.apiBaseUrl}/programas/${programaId}`)
      .pipe(
        map(() => undefined),
        catchError(erroHttp),
      );
  }
}
