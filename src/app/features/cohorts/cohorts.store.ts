import { Injectable, inject, signal } from '@angular/core';

import { Cohort, Course } from '../../core/models';
import { CohortService } from '../../core/services/cohort.service';
import { CourseService } from '../../core/services/course.service';
import { loadable } from '../../core/state/loadable';

/** Courses and cohorts, shared by both tabs of the screen; provided by it. */
@Injectable()
export class CohortsStore {
  private readonly courseService = inject(CourseService);
  private readonly cohortService = inject(CohortService);

  readonly courses = loadable({ source: () => this.courseService.list(), initial: [] as Course[] });
  readonly cohorts = loadable({ source: () => this.cohortService.list(), initial: [] as Cohort[] });

  /** A failed create, edit or remove; loading failures are `courses.error()` and `cohorts.error()`. */
  readonly actionError = signal('');

  /** By id; cohorts from before the course registry only have the name. */
  cohortsOf(course: Course): number {
    return this.cohorts.value().filter((c) => (c.graduacaoId ? c.graduacaoId === course.id : c.nome === course.nome)).length;
  }

  isRegistered(courseName: string): boolean {
    return this.courses.value().some((c) => c.nome === courseName);
  }

  reloadCourses(): void {
    this.courses.reload();
  }

  reloadCohorts(): void {
    this.cohorts.reload();
  }
}
