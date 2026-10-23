import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, of, startWith, switchMap } from 'rxjs';

import { Course } from '../../core/models';
import { CohortService } from '../../core/services/cohort.service';
import { CourseService } from '../../core/services/course.service';

function reloadable<T>(reload$: Subject<void>, list: () => Observable<T[]>, error: WritableSignal<string>) {
  return toSignal(
    reload$.pipe(
      startWith(undefined),
      switchMap(() =>
        list().pipe(
          catchError((e: Error) => {
            error.set(e.message);
            return of([] as T[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as T[] },
  );
}

/** Courses and cohorts, shared by both tabs of the screen; provided by it. */
@Injectable()
export class CohortsStore {
  private readonly courseService = inject(CourseService);
  private readonly cohortService = inject(CohortService);
  private readonly reloadCourses$ = new Subject<void>();
  private readonly reloadCohorts$ = new Subject<void>();

  readonly coursesError = signal('');
  readonly cohortsError = signal('');
  readonly courses = reloadable(this.reloadCourses$, () => this.courseService.list(), this.coursesError);
  readonly cohorts = reloadable(this.reloadCohorts$, () => this.cohortService.list(), this.cohortsError);

  /** By id; cohorts from before the course registry only have the name. */
  cohortsOf(course: Course): number {
    return this.cohorts().filter((c) => (c.graduacaoId ? c.graduacaoId === course.id : c.nome === course.nome)).length;
  }

  isRegistered(courseName: string): boolean {
    return this.courses().some((c) => c.nome === courseName);
  }

  reloadCourses(): void {
    this.reloadCourses$.next();
  }

  reloadCohorts(): void {
    this.reloadCohorts$.next();
  }
}
