import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NovoPrograma, Programa } from '../models';
import { erroHttp } from './http-erro';
import { MemoriaStore } from './memoria.store';

/**
 * Espelha o domínio `programa` do backend: agrupa os PFCs de uma turma sob
 * um Curso. Só o coordenador de PFC cria — a UI já restringe isso.
 */
export abstract class ProgramaService {
  abstract listar(): Observable<Programa[]>;
  abstract criar(novo: NovoPrograma): Observable<Programa>;
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
}

/** Ambos os endpoints existem no backend de verdade — sem gaps aqui. */
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
}
