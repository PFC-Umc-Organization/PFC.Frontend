import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { dedupeInterceptor } from './core/interceptors/dedupe.interceptor';
import {
  ActivityHttpService,
  ActivityService,
} from './core/services/activity.service';
import {
  InvitationHttpService,
  InvitationService,
} from './core/services/invitation.service';
import { CohortHttpService, CohortService } from './core/services/cohort.service';
import {
  SubmissionHttpService,
  SubmissionService,
} from './core/services/submission.service';
import {
  CourseHttpService,
  CourseService,
} from './core/services/course.service';
import {
  MaterialHttpService,
  MaterialService,
} from './core/services/material.service';
import {
  EnrollmentHttpService,
  EnrollmentService,
} from './core/services/enrollment.service';
import {
  ProgramHttpService,
  ProgramService,
} from './core/services/program.service';
import {
  ProjectHttpService,
  ProjectService,
} from './core/services/project.service';
import {
  ReferenceHttpService,
  ReferenceService,
} from './core/services/reference.service';
import {
  UserHttpService,
  UserService,
} from './core/services/user.service';

/** The one place that picks each service's implementation. */
export const appConfig: ApplicationConfig = {
  providers: [
    // No zone.js: a view is checked only when a signal it reads changes (or on
    // a template event). Every component is OnPush and all screen state is a
    // signal; see the README, "Detecção de mudanças".
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([dedupeInterceptor, authInterceptor]),
    ),

    { provide: UserService, useClass: UserHttpService },
    { provide: CohortService, useClass: CohortHttpService },
    { provide: CourseService, useClass: CourseHttpService },
    { provide: ProgramService, useClass: ProgramHttpService },
    { provide: ProjectService, useClass: ProjectHttpService },
    { provide: InvitationService, useClass: InvitationHttpService },
    { provide: ActivityService, useClass: ActivityHttpService },
    { provide: SubmissionService, useClass: SubmissionHttpService },
    { provide: MaterialService, useClass: MaterialHttpService },
    { provide: EnrollmentService, useClass: EnrollmentHttpService },
    { provide: ReferenceService, useClass: ReferenceHttpService },
  ],
};
