import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NewProgram, Program } from '../models';
import { toApiError } from './http-error';

// Serviço
export abstract class ProgramService {
  // Listagem
  abstract list(): Observable<Program[]>;
  // Criação
  abstract create(program: NewProgram): Observable<Program>;
  // Atualização
  abstract update(programId: string, cohortId: string): Observable<void>;
  // Exclusão
  abstract remove(programId: string): Observable<void>;
}

// Serviço
@Injectable()
export class ProgramHttpService extends ProgramService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/programas`;

  // Listagem
  override list(): Observable<Program[]> {
    return this.http.get<Program[]>(this.url).pipe(catchError(toApiError));
  }

  // Criação
  override create(program: NewProgram): Observable<Program> {
    return this.http.post<Program>(this.url, program).pipe(catchError(toApiError));
  }

  // Atualização
  override update(programId: string, cohortId: string): Observable<void> {
    return this.http.put(`${this.url}/${programId}`, { cursoId: cohortId }).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // Exclusão
  override remove(programId: string): Observable<void> {
    return this.http.delete(`${this.url}/${programId}`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
