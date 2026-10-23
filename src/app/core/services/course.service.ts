import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Course } from '../models';
import { toApiError } from './http-error';

export abstract class CourseService {
  abstract list(): Observable<Course[]>;
  abstract create(name: string): Observable<Course>;
  abstract update(id: string, name: string): Observable<void>;
  /** The backend refuses (409) while the course has cohorts. */
  abstract remove(id: string): Observable<void>;
}

@Injectable()
export class CourseHttpService extends CourseService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/cursos`;

  override list(): Observable<Course[]> {
    return this.http.get<Course[]>(this.url).pipe(catchError(toApiError));
  }

  override create(name: string): Observable<Course> {
    return this.http.post<Course>(this.url, { nome: name }).pipe(catchError(toApiError));
  }

  override update(id: string, name: string): Observable<void> {
    return this.http.put(`${this.url}/${id}`, { nome: name }).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override remove(id: string): Observable<void> {
    return this.http.delete(`${this.url}/${id}`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
