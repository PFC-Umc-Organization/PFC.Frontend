import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, map, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Activity, Answers, ProjectStatusRow, Submission, TimelineItem, UploadEvent, ValidationInput } from '../models';
import { ActivityService } from './activity.service';
import { toApiError } from './http-error';
import { submissionStatus, submittedFileName } from './submission-status';
import { UploadTicket, uploadToBucket } from './upload';

// Tipo
export interface StatusGrid {
  activities: Activity[];
  rows: ProjectStatusRow[];
  submissions: Submission[];
}

// Serviço
export abstract class SubmissionService {
  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------

  // Cronograma
  abstract projectTimeline(projectId: string, projectName?: string): Observable<TimelineItem[]>;
  // Por programa
  abstract ofProgram(programId: string): Observable<Submission[]>;
  // Por projeto
  abstract ofProject(projectId: string): Observable<Submission[]>;

  // ---------------------------------------------------------------------------
  // Entregas
  // ---------------------------------------------------------------------------

  // Exclusão
  abstract remove(projectId: string, activityId: string): Observable<void>;
  // Validação
  abstract validate(projectId: string, activityId: string, input: ValidationInput): Observable<void>;
  // Submissão
  abstract submit(activityId: string, projectId: string, answers: Answers): Observable<void>;

  // ---------------------------------------------------------------------------
  // Arquivos
  // ---------------------------------------------------------------------------

  // Upload
  abstract uploadFile(projectId: string, activityId: string, fieldId: string, file: File): Observable<UploadEvent>;
  // Link
  abstract fileLink(projectId: string, activityId: string, fieldId: string): Observable<{ url: string; nome: string }>;

  // ---------------------------------------------------------------------------
  // Alterações
  // ---------------------------------------------------------------------------

  abstract changes(): Observable<void>;
}

// Serviço
@Injectable()
export class SubmissionHttpService extends SubmissionService {
  private readonly http = inject(HttpClient);
  private readonly activities = inject(ActivityService);
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly base = `${environment.apiBaseUrl}/projetos`;

  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------

  // Consulta
  override ofProject(projectId: string): Observable<Submission[]> {
    return this.reload$.pipe(
      switchMap(() =>
        this.http.get<Submission[]>(`${this.base}/${projectId}/entregas`).pipe(catchError(toApiError)),
      ),
    );
  }

  // Cronograma
  override projectTimeline(projectId: string, projectName = ''): Observable<TimelineItem[]> {
    return combineLatest([this.activities.list(), this.ofProject(projectId)]).pipe(
      map(([activities, submissions]) =>
        activities.map<TimelineItem>((activity) => {
          const submission = submissions.find((s) => s.atividadeId === activity.id);
          return {
            activityId: activity.id,
            title: activity.titulo,
            projectName,
            deadline: activity.prazo,
            status: submissionStatus(activity.prazo, submission?.entregueEm),
            fileName: submittedFileName(activity, submission?.respostas),
            validation: submission ? (submission.validacao ?? null) : undefined,
          };
        }),
      ),
    );
  }

  // Por programa
  override ofProgram(programId: string): Observable<Submission[]> {
    return this.reload$.pipe(
      switchMap(() =>
        this.http.get<Submission[]>(`${environment.apiBaseUrl}/programas/${programId}/entregas`).pipe(catchError(toApiError)),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Arquivos
  // ---------------------------------------------------------------------------

  // Upload
  override uploadFile(projectId: string, activityId: string, fieldId: string, file: File): Observable<UploadEvent> {
    return this.http
      .post<UploadTicket>(`${this.base}/${projectId}/entregas/${activityId}/arquivos`, {
        campoId: fieldId,
        nome: file.name,
        tamanho: file.size,
      })
      .pipe(
        catchError(toApiError),
        switchMap((ticket) => uploadToBucket(this.http, ticket, file)),
      );
  }

  // Link
  override fileLink(projectId: string, activityId: string, fieldId: string): Observable<{ url: string; nome: string }> {
    return this.http
      .get<{ url: string; nome: string }>(`${this.base}/${projectId}/entregas/${activityId}/arquivos/${fieldId}`)
      .pipe(catchError(toApiError));
  }

  // ---------------------------------------------------------------------------
  // Alterações
  // ---------------------------------------------------------------------------

  override changes(): Observable<void> {
    return this.reload$.asObservable();
  }

  // ---------------------------------------------------------------------------
  // Entregas
  // ---------------------------------------------------------------------------

  // Exclusão
  override remove(projectId: string, activityId: string): Observable<void> {
    return this.http.delete(`${this.base}/${projectId}/entregas/${activityId}`).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // Validação
  override validate(projectId: string, activityId: string, input: ValidationInput): Observable<void> {
    return this.http.put(`${this.base}/${projectId}/entregas/${activityId}/validacao`, input).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }

  // Submissão
  override submit(activityId: string, projectId: string, answers: Answers): Observable<void> {
    return this.http.put(`${this.base}/${projectId}/entregas/${activityId}`, { respostas: answers }).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
