import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, map, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Activity, Answers, ProjectStatusRow, Submission, TimelineItem, UploadEvent } from '../models';
import { ActivityService } from './activity.service';
import { toApiError } from './http-error';
import { ProjectService } from './project.service';
import { submissionStatus, submittedFileName } from './submission-status';
import { UploadTicket, uploadToBucket } from './upload';

export interface StatusGrid {
  activities: Activity[];
  rows: ProjectStatusRow[];
  /** With the answers, so a cell's detail needs no extra call. */
  submissions: Submission[];
}

export abstract class SubmissionService {
  abstract projectTimeline(projectId: string, projectName?: string): Observable<TimelineItem[]>;
  /** Project × activity grid of a program, in parallel calls; refreshes on removal. */
  abstract statusGrid(programId: string): Observable<StatusGrid>;
  /** Refreshes after every submit and removal. */
  abstract ofProject(projectId: string): Observable<Submission[]>;
  /** Hands the activity back to the group. */
  abstract remove(projectId: string, activityId: string): Observable<void>;
  abstract submit(activityId: string, projectId: string, answers: Answers): Observable<void>;
  /**
   * Uploads straight to the bucket and ends with the key, the field's answer.
   * An error with `status` 503 means the backend has no bucket yet.
   */
  abstract uploadFile(projectId: string, activityId: string, fieldId: string, file: File): Observable<UploadEvent>;
  /** A download link valid for 5 minutes. */
  abstract fileLink(projectId: string, activityId: string, fieldId: string): Observable<{ url: string; nome: string }>;
  /** Emits now and after every submit and removal. */
  abstract changes(): Observable<void>;
}

@Injectable()
export class SubmissionHttpService extends SubmissionService {
  private readonly http = inject(HttpClient);
  private readonly activities = inject(ActivityService);
  private readonly projects = inject(ProjectService);
  private readonly reload$ = new BehaviorSubject<void>(undefined);
  private readonly base = `${environment.apiBaseUrl}/projetos`;

  override ofProject(projectId: string): Observable<Submission[]> {
    return this.reload$.pipe(
      switchMap(() =>
        this.http.get<Submission[]>(`${this.base}/${projectId}/entregas`).pipe(catchError(toApiError)),
      ),
    );
  }

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
          };
        }),
      ),
    );
  }

  override statusGrid(programId: string): Observable<StatusGrid> {
    const submissions$ = this.reload$.pipe(
      switchMap(() =>
        this.http
          .get<Submission[]>(`${environment.apiBaseUrl}/programas/${programId}/entregas`)
          .pipe(catchError(toApiError)),
      ),
    );
    return combineLatest([this.projects.list(programId), this.activities.list(), submissions$]).pipe(
      map(([projects, activities, submissions]) => ({
        activities,
        submissions,
        rows: projects.map<ProjectStatusRow>((project) => ({
          project: { id: project.id, nome: project.nome },
          cells: activities.map((activity) => ({
            activityId: activity.id,
            status: submissionStatus(
              activity.prazo,
              submissions.find((s) => s.projetoId === project.id && s.atividadeId === activity.id)?.entregueEm,
            ),
          })),
        })),
      })),
    );
  }

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

  override fileLink(projectId: string, activityId: string, fieldId: string): Observable<{ url: string; nome: string }> {
    return this.http
      .get<{ url: string; nome: string }>(`${this.base}/${projectId}/entregas/${activityId}/arquivos/${fieldId}`)
      .pipe(catchError(toApiError));
  }

  override changes(): Observable<void> {
    return this.reload$.asObservable();
  }

  override remove(projectId: string, activityId: string): Observable<void> {
    return this.http.delete(`${this.base}/${projectId}/entregas/${activityId}`).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }

  override submit(activityId: string, projectId: string, answers: Answers): Observable<void> {
    return this.http.put(`${this.base}/${projectId}/entregas/${activityId}`, { respostas: answers }).pipe(
      tap(() => this.reload$.next()),
      map(() => undefined),
      catchError(toApiError),
    );
  }
}
