import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NewProgram, Program } from '../models';
import { toApiError } from './http-error';

export abstract class ProgramService {
  abstract list(): Observable<Program[]>;
  abstract create(program: NewProgram): Observable<Program>;
  /** Moves the program to another cohort, the only thing it has to edit. */
  abstract update(programId: string, cohortId: string): Observable<void>;
  abstract remove(programId: string): Observable<void>;
}

@Injectable()
export class ProgramHttpService extends ProgramService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/programas`;

  override list(): Observable<Program[]> {
    return this.http.get<Program[]>(this.url).pipe(catchError(toApiError));
  }

  override create(program: NewProgram): Observable<Program> {
    return this.http.post<Program>(this.url, program).pipe(catchError(toApiError));
  }

  override update(programId: string, cohortId: string): Observable<void> {
    return this.http.put(`${this.url}/${programId}`, { cursoId: cohortId }).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override remove(programId: string): Observable<void> {
    return this.http.delete(`${this.url}/${programId}`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
