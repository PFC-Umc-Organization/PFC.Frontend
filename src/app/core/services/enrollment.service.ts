import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Enrollment, EnrollmentResult } from '../models';
import { toApiError } from './http-error';

/** RGMs pre-authorized by the coordination in a cohort. */
export abstract class EnrollmentService {
  abstract list(cohortId: string): Observable<Enrollment[]>;
  abstract enroll(rgms: string[], cohortId: string): Observable<EnrollmentResult>;
  abstract remove(rgms: string[]): Observable<EnrollmentResult>;
}

@Injectable()
export class EnrollmentHttpService extends EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/admin/students`;

  override list(cohortId: string): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(this.url, { params: { turmaId: cohortId } }).pipe(catchError(toApiError));
  }

  override enroll(rgms: string[], cohortId: string): Observable<EnrollmentResult> {
    return this.http
      .post<EnrollmentResult>(this.url, { rgms, turmaId: cohortId })
      .pipe(catchError(toApiError));
  }

  override remove(rgms: string[]): Observable<EnrollmentResult> {
    return this.http
      .request<EnrollmentResult>('DELETE', this.url, { body: { rgms } })
      .pipe(catchError(toApiError));
  }
}
