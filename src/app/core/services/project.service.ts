import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MyPfc, NewStudentProject, Project, ProjectDetail, ProjectStatus, ProjectUpdate } from '../models';
import { toApiError } from './http-error';
import { ProgramService } from './program.service';

// Serviço
export abstract class ProjectService {
  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------

  // Listagem
  abstract list(programId?: string): Observable<Project[]>;
  // Detalhe
  abstract detail(projectId: string): Observable<ProjectDetail>;
  // Meu PFC
  abstract myPfc(): Observable<MyPfc>;
  // Projeto do aluno
  abstract myProject(): Observable<Project | null>;

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  abstract createMine(project: NewStudentProject): Observable<Project>;

  // ---------------------------------------------------------------------------
  // Integrantes
  // ---------------------------------------------------------------------------

  // Inclusão
  abstract addMember(projectId: string, rgm: string): Observable<void>;
  // Remoção
  abstract removeMember(projectId: string, rgm: string): Observable<void>;

  // ---------------------------------------------------------------------------
  // Edição
  // ---------------------------------------------------------------------------

  // Atualização
  abstract update(projectId: string, changes: ProjectUpdate): Observable<void>;

  // ---------------------------------------------------------------------------
  // Orientador
  // ---------------------------------------------------------------------------

  // Atribuição
  abstract setAdvisor(projectId: string, advisorId: string): Observable<void>;
  // Remoção
  abstract removeAdvisor(projectId: string): Observable<void>;

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  // Definição: null volta para a sugestão do sistema
  abstract setStatus(projectId: string, status: ProjectStatus | null, note?: string): Observable<void>;

  // ---------------------------------------------------------------------------
  // Exclusão
  // ---------------------------------------------------------------------------

  abstract remove(projectId: string): Observable<void>;
}

// Serviço
@Injectable()
export class ProjectHttpService extends ProjectService {
  private readonly http = inject(HttpClient);
  private readonly programs = inject(ProgramService);
  private readonly url = `${environment.apiBaseUrl}/projetos`;

  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------

  // Listagem
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

  // Por programa
  private ofProgram(programId: string): Observable<Project[]> {
    return this.http
      .get<Project[]>(`${environment.apiBaseUrl}/programas/${programId}/projetos`)
      .pipe(catchError(toApiError));
  }

  // Detalhe
  override detail(projectId: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${this.url}/${projectId}`).pipe(catchError(toApiError));
  }

  // Meu PFC
  override myPfc(): Observable<MyPfc> {
    return this.http.get<MyPfc>(`${environment.apiBaseUrl}/meu-pfc`).pipe(catchError(toApiError));
  }

  // Projeto do aluno
  override myProject(): Observable<Project | null> {
    return this.myPfc().pipe(map((m) => m.grupo?.projeto ?? null));
  }

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------

  override createMine(project: NewStudentProject): Observable<Project> {
    return this.http
      .post<Project>(`${environment.apiBaseUrl}/meu-pfc`, project)
      .pipe(catchError(toApiError));
  }

  // ---------------------------------------------------------------------------
  // Integrantes
  // ---------------------------------------------------------------------------

  // Inclusão
  override addMember(projectId: string, rgm: string): Observable<void> {
    return this.http.put(`${this.url}/${projectId}/integrantes`, { rgm }).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // Remoção
  override removeMember(projectId: string, rgm: string): Observable<void> {
    return this.http
      .request('DELETE', `${this.url}/${projectId}/integrantes`, { body: { rgm } })
      .pipe(
        map(() => undefined),
        catchError(toApiError),
      );
  }

  // ---------------------------------------------------------------------------
  // Edição
  // ---------------------------------------------------------------------------

  // Atualização
  override update(projectId: string, changes: ProjectUpdate): Observable<void> {
    return this.http.put(`${this.url}/${projectId}`, changes).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // ---------------------------------------------------------------------------
  // Orientador
  // ---------------------------------------------------------------------------

  // Atribuição
  override setAdvisor(projectId: string, advisorId: string): Observable<void> {
    return this.http.put(`${this.url}/${projectId}/orientador`, { orientadorId: advisorId }).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // Remoção
  override removeAdvisor(projectId: string): Observable<void> {
    return this.http.delete(`${this.url}/${projectId}/orientador`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  // Definição
  override setStatus(projectId: string, status: ProjectStatus | null, note = ''): Observable<void> {
    return this.http.put(`${this.url}/${projectId}/status`, { status: status ?? '', ressalva: note }).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // ---------------------------------------------------------------------------
  // Exclusão
  // ---------------------------------------------------------------------------

  override remove(projectId: string): Observable<void> {
    return this.http.delete(`${this.url}/${projectId}`).pipe(
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
