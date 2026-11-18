import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Course } from '../models';
import { toApiError } from './http-error';

// Serviço
export abstract class CourseService {
  // Listagem
  abstract list(): Observable<Course[]>;
  // Criação
  abstract create(name: string): Observable<Course>;
  // Atualização
  abstract update(id: string, name: string): Observable<void>;
  // Exclusão
  abstract remove(id: string): Observable<void>;
}

// Serviço
@Injectable()
export class CourseHttpService extends CourseService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/cursos`;

  // Listagem
  override list(): Observable<Course[]> {
    return this.http.get<Course[]>(this.url).pipe(catchError(toApiError));
  }

  // Criação
  override create(name: string): Observable<Course> {
    return this.http.post<Course>(this.url, { nome: name }).pipe(catchError(toApiError));
  }

  // Atualização
  override update(id: string, name: string): Observable<void> {
    return this.http.put(`${this.url}/${id}`, { nome: name }).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // Exclusão
  override remove(id: string): Observable<void> {
    return this.http.delete(`${this.url}/${id}`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
