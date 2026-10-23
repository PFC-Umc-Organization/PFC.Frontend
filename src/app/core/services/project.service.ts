import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MyPfc, NewStudentProject, Project, ProjectDetail, ProjectUpdate } from '../models';
import { toApiError } from './http-error';
import { ProgramService } from './program.service';

export abstract class ProjectService {
  /** Without `programId`, the projects of every program. */
  abstract list(programId?: string): Observable<Project[]>;
  abstract detail(projectId: string): Observable<ProjectDetail>;
  /** The signed-in student's group, or the cohort where they can create one. */
  abstract myPfc(): Observable<MyPfc>;
  abstract myProject(): Observable<Project | null>;
  /** The signed-in student creates their group's project, in their cohort. */
  abstract createMine(project: NewStudentProject): Observable<Project>;
  abstract addMember(projectId: string, rgm: string): Observable<void>;
  abstract removeMember(projectId: string, rgm: string): Observable<void>;
  abstract update(projectId: string, changes: ProjectUpdate): Observable<void>;
  abstract setAdvisor(projectId: string, advisorId: string): Observable<void>;
  abstract removeAdvisor(projectId: string): Observable<void>;
  abstract remove(projectId: string): Observable<void>;
}

@Injectable()
export class ProjectHttpService extends ProjectService {
  private readonly http = inject(HttpClient);
  private readonly programs = inject(ProgramService);
  private readonly url = `${environment.apiBaseUrl}/projetos`;

  override list(programId?: string): Observable<Project[]> {
    if (programId) {
      return this.ofProgram(programId);
    }
    return this.programs.list().pipe(
      switchMap((programs) =>
        programs.length ? forkJoin(programs.map((p) => this.ofProgram(p.id))) : of([] as Project[][]),
      ),
      map((lists) => lists.flat()),
    );
  }

  private ofProgram(programId: string): Observable<Project[]> {
    return this.http
      .get<Project[]>(`${environment.apiBaseUrl}/programas/${programId}/projetos`)
      .pipe(catchError(toApiError));
  }

  override detail(projectId: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${this.url}/${projectId}`).pipe(catchError(toApiError));
  }

  override myPfc(): Observable<MyPfc> {
    return this.http.get<MyPfc>(`${environment.apiBaseUrl}/meu-pfc`).pipe(catchError(toApiError));
  }

  override myProject(): Observable<Project | null> {
    return this.myPfc().pipe(map((m) => m.grupo?.projeto ?? null));
  }

  override createMine(project: NewStudentProject): Observable<Project> {
    return this.http
      .post<Project>(`${environment.apiBaseUrl}/meu-pfc`, project)
      .pipe(catchError(toApiError));
  }

  override addMember(projectId: string, rgm: string): Observable<void> {
    return this.http.put(`${this.url}/${projectId}/integrantes`, { rgm }).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override removeMember(projectId: string, rgm: string): Observable<void> {
    return this.http
      .request('DELETE', `${this.url}/${projectId}/integrantes`, { body: { rgm } })
      .pipe(
        map(() => undefined),
        catchError(toApiError),
      );
  }

  override update(projectId: string, changes: ProjectUpdate): Observable<void> {
    return this.http.put(`${this.url}/${projectId}`, changes).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override setAdvisor(projectId: string, advisorId: string): Observable<void> {
    return this.http.put(`${this.url}/${projectId}/orientador`, { orientadorId: advisorId }).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override removeAdvisor(projectId: string): Observable<void> {
    return this.http.delete(`${this.url}/${projectId}/orientador`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override remove(projectId: string): Observable<void> {
    return this.http.delete(`${this.url}/${projectId}`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
