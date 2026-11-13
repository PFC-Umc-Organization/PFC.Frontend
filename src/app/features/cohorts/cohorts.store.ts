import { Injectable, computed, inject, signal } from '@angular/core';

import { Cohort, Course, Program, Project } from '../../core/models';
import { CohortService } from '../../core/services/cohort.service';
import { CourseService } from '../../core/services/course.service';
import { ProgramService } from '../../core/services/program.service';
import { ProjectService } from '../../core/services/project.service';
import { action } from '../../core/state/action';
import { loadable } from '../../core/state/loadable';
import { PfcManagementStore } from '../pfc-management/pfc-management.store';

export interface CohortRow {
  cohort: Cohort;
  programId: string | null;
  /** undefined while the count is loading or failed, so it never reads as zero. */
  projects: number | undefined;
}

type Done = (() => void) | undefined;
type CohortBody = Parameters<CohortService['create']>[0];
type CohortChanges = Parameters<CohortService['update']>[1];

/** By id; cohorts from before the course registry only have the name. */
export function belongsTo(cohort: Cohort, course: Course): boolean {
  return cohort.graduacaoId ? cohort.graduacaoId === course.id : cohort.nome === course.nome;
}

function sorted(rows: CohortRow[]): CohortRow[] {
  return rows.sort(
    (a, b) => b.cohort.periodo.localeCompare(a.cohort.periodo, 'pt-BR') || a.cohort.turno.localeCompare(b.cohort.turno),
  );
}

/** Courses, cohorts and PFC programs, shared by the tabs of the screen; provided by it with `PfcManagementStore`. */
@Injectable()
export class CohortsStore {
  private readonly courseService = inject(CourseService);
  private readonly cohortService = inject(CohortService);
  private readonly programService = inject(ProgramService);
  private readonly projectService = inject(ProjectService);
  private readonly pfc = inject(PfcManagementStore);

  readonly courses = loadable({ source: () => this.courseService.list(), initial: [] as Course[] });
  readonly cohorts = loadable({ source: () => this.cohortService.list(), initial: [] as Cohort[] });
  /**
   * Every project of every program, only to count them; while loading or after a
   * failure the count is unknown, so it never unlocks moving or removing a program.
   */
  readonly allProjects = loadable({ source: () => this.projectService.list(), initial: [] as Project[] });

  private countsRead = false;

  /**
   * The screen shows the counts again after another tab changed projects: the
   * first call finds the read already on its way, the next ones read again.
   */
  recount(): void {
    if (this.countsRead) {
      this.allProjects.reload();
    }
    this.countsRead = true;
  }

  private readonly programByCohort = computed(() => new Map<string, Program>(this.pfc.programs.value().map((p) => [p.cursoId, p])));
  private readonly projectsByProgram = computed(() => {
    const counts = new Map<string, number>();
    for (const p of this.allProjects.value()) {
      counts.set(p.programaId, (counts.get(p.programaId) ?? 0) + 1);
    }
    return counts;
  });

  private projectCount(programId: string): number | undefined {
    return this.allProjects.loading() || this.allProjects.error() ? undefined : (this.projectsByProgram().get(programId) ?? 0);
  }

  private rowOf(cohort: Cohort): CohortRow {
    const program = this.programByCohort().get(cohort.id);
    return { cohort, programId: program?.id ?? null, projects: program ? this.projectCount(program.id) : 0 };
  }

  /** Each course with its cohorts, and the cohorts of no registered course. */
  readonly groups = computed(() => {
    const cohorts = this.cohorts.value();
    const placed = new Set<string>();
    const groups = this.courses.value().map((course) => {
      const mine = cohorts.filter((c) => belongsTo(c, course));
      mine.forEach((c) => placed.add(c.id));
      return { course, rows: sorted(mine.map((c) => this.rowOf(c))) };
    });
    return { groups, loose: sorted(cohorts.filter((c) => !placed.has(c.id)).map((c) => this.rowOf(c))) };
  });

  /** Programs whose cohort was removed. */
  readonly orphans = computed(() => {
    if (this.pfc.loadError()) {
      return [];
    }
    const ids = new Set(this.cohorts.value().map((c) => c.id));
    return this.pfc.programs.value().filter((p) => !ids.has(p.cursoId)).map((p) => ({ programId: p.id, projects: this.projectCount(p.id) }));
  });

  readonly withProgram = computed(() => this.cohorts.value().filter((c) => this.programByCohort().has(c.id)).length);

  /** Cohorts a program can move to: the ones without a program. */
  readonly freeCohorts = computed(() => this.cohorts.value().filter((c) => !this.programByCohort().has(c.id)));

  cohortsOf(course: Course): number {
    return this.cohorts.value().filter((c) => belongsTo(c, course)).length;
  }

  isRegistered(courseName: string): boolean {
    return this.courses.value().some((c) => c.nome === courseName);
  }

  // --- Changes. `done` runs on success, for the screen to close its form.

  /** A failed create, edit or remove of a course or cohort; loading failures are `courses.error()` and `cohorts.error()`. */
  readonly actionError = signal('');
  /** A failed create, move or remove of a program. */
  readonly programsError = signal('');
  private readonly failCourse = (e: Error) => this.actionError.set(e.message);
  private readonly failProgram = (e: Error) => this.programsError.set(e.message);

  /** A change to the cohorts reaches the other tabs, which load their own copy. */
  private cohortsChanged(): void {
    this.cohorts.reload();
    this.pfc.retryLoad();
  }

  private readonly createCourseAction = action((name: string, _done?: Done) => this.courseService.create(name), {
    onSuccess: (_r, _name, done) => {
      done?.();
      this.courses.reload();
    },
    onError: this.failCourse,
  });
  private readonly updateCourseAction = action((id: string, name: string, _done?: Done) => this.courseService.update(id, name), {
    onSuccess: (_r, _id, _name, done) => {
      done?.();
      this.courses.reload();
      // The course's cohorts are read with the new name.
      this.cohortsChanged();
    },
    onError: this.failCourse,
  });
  private readonly removeCourseAction = action((id: string) => this.courseService.remove(id), {
    onSuccess: () => this.courses.reload(),
    onError: this.failCourse,
    concurrency: 'merge',
  });
  private readonly createCohortAction = action((body: CohortBody, _done?: Done) => this.cohortService.create(body), {
    onSuccess: (_r, _body, done) => {
      done?.();
      this.cohortsChanged();
    },
    onError: this.failCourse,
  });
  private readonly updateCohortAction = action((id: string, body: CohortChanges, _done?: Done) => this.cohortService.update(id, body), {
    onSuccess: (_r, _id, _body, done) => {
      done?.();
      this.cohortsChanged();
    },
    onError: this.failCourse,
  });
  private readonly removeCohortAction = action((id: string) => this.cohortService.remove(id), {
    onSuccess: () => this.cohortsChanged(),
    onError: this.failCourse,
    concurrency: 'merge',
  });
  private readonly createProgramAction = action((cohortId: string) => this.programService.create({ cursoId: cohortId }), {
    onSuccess: () => this.pfc.reloadPrograms(),
    onError: this.failProgram,
    concurrency: 'merge',
  });
  private readonly moveProgramAction = action((id: string, cohortId: string, _done?: Done) => this.programService.update(id, cohortId), {
    onSuccess: (_r, _id, _cohortId, done) => {
      done?.();
      this.pfc.reloadPrograms();
    },
    onError: this.failProgram,
  });
  private readonly removeProgramAction = action((id: string) => this.programService.remove(id), {
    onSuccess: () => this.pfc.reloadPrograms(),
    onError: this.failProgram,
    concurrency: 'merge',
  });

  readonly courseCreating = this.createCourseAction.pending;
  readonly cohortCreating = this.createCohortAction.pending;
  /** Any write in flight: deletes and saves wait for it. */
  readonly busy = computed(
    () =>
      this.createCourseAction.pending() ||
      this.updateCourseAction.pending() ||
      this.removeCourseAction.pending() ||
      this.createCohortAction.pending() ||
      this.updateCohortAction.pending() ||
      this.removeCohortAction.pending() ||
      this.createProgramAction.pending() ||
      this.moveProgramAction.pending() ||
      this.removeProgramAction.pending(),
  );
  private readonly programTarget = signal<string | null>(null);
  /** The cohort whose program is being created. */
  readonly programCreating = computed(() => (this.createProgramAction.pending() ? this.programTarget() : null));

  clearErrors(): void {
    this.actionError.set('');
    this.programsError.set('');
  }

  createCourse(name: string, done?: Done): void {
    this.clearErrors();
    this.createCourseAction.run(name, done);
  }

  updateCourse(id: string, name: string, done?: Done): void {
    this.clearErrors();
    this.updateCourseAction.run(id, name, done);
  }

  removeCourse(id: string): void {
    this.clearErrors();
    this.removeCourseAction.run(id);
  }

  createCohort(body: CohortBody, done?: Done): void {
    this.clearErrors();
    this.createCohortAction.run(body, done);
  }

  updateCohort(id: string, body: CohortChanges, done?: Done): void {
    this.clearErrors();
    this.updateCohortAction.run(id, body, done);
  }

  removeCohort(id: string): void {
    this.clearErrors();
    this.removeCohortAction.run(id);
  }

  createProgram(cohortId: string): void {
    this.clearErrors();
    this.programTarget.set(cohortId);
    this.createProgramAction.run(cohortId);
  }

  moveProgram(id: string, cohortId: string, done?: Done): void {
    this.clearErrors();
    this.moveProgramAction.run(id, cohortId, done);
  }

  removeProgram(id: string): void {
    this.clearErrors();
    this.removeProgramAction.run(id);
  }
}
