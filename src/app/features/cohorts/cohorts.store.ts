import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, map, of, switchMap } from 'rxjs';

import { Cohort, Course, Program, Project } from '../../core/models';
import { CohortService } from '../../core/services/cohort.service';
import { CourseService } from '../../core/services/course.service';
import { ProgramService } from '../../core/services/program.service';
import { ProjectService } from '../../core/services/project.service';
import { action } from '../../core/state/action';
import { loadable } from '../../core/state/loadable';
import { PfcManagementStore } from '../pfc-management/pfc-management.store';

// Linha
export interface CohortRow {
  cohort: Cohort;
  programId: string | null;
  projects: number | undefined;
}

// Parâmetros
type Done = (() => void) | undefined;
type CohortBody = Parameters<CohortService['create']>[0];
type CohortChanges = Parameters<CohortService['update']>[1];

// Vínculo
export function belongsTo(cohort: Cohort, course: Course): boolean {
  return cohort.graduacaoId ? cohort.graduacaoId === course.id : cohort.nome === course.nome;
}

// Ordenação
function sorted(rows: CohortRow[]): CohortRow[] {
  return rows.sort(
    (a, b) => b.cohort.periodo.localeCompare(a.cohort.periodo, 'pt-BR') || a.cohort.turno.localeCompare(b.cohort.turno),
  );
}

// Store
@Injectable()
export class CohortsStore {
  private readonly courseService = inject(CourseService);
  private readonly cohortService = inject(CohortService);
  private readonly programService = inject(ProgramService);
  private readonly projectService = inject(ProjectService);
  private readonly pfc = inject(PfcManagementStore);

  // ---------------------------------------------------------------------------
  // Dados
  // ---------------------------------------------------------------------------

  readonly courses = loadable({ source: () => this.courseService.list(), initial: [] as Course[] });
  readonly cohorts = loadable({ source: () => this.cohortService.list(), initial: [] as Cohort[] });
  readonly allProjects = loadable({ source: () => this.projectService.list(), initial: [] as Project[] });

  // ---------------------------------------------------------------------------
  // Contagem
  // ---------------------------------------------------------------------------

  private countsRead = false;

  // Recontagem
  recount(): void {
    if (this.countsRead) {
      this.allProjects.reload();
    }
    this.countsRead = true;
  }

  // ---------------------------------------------------------------------------
  // Agrupamento
  // ---------------------------------------------------------------------------

  private readonly programByCohort = computed(() => new Map<string, Program>(this.pfc.programs.value().map((p) => [p.cursoId, p])));
  private readonly projectsByProgram = computed(() => {
    const counts = new Map<string, number>();
    for (const p of this.allProjects.value()) {
      counts.set(p.programaId, (counts.get(p.programaId) ?? 0) + 1);
    }
    return counts;
  });

  // Contagem
  private projectCount(programId: string): number | undefined {
    return this.allProjects.loading() || this.allProjects.error() ? undefined : (this.projectsByProgram().get(programId) ?? 0);
  }

  // Montagem
  private rowOf(cohort: Cohort): CohortRow {
    const program = this.programByCohort().get(cohort.id);
    return { cohort, programId: program?.id ?? null, projects: program ? this.projectCount(program.id) : 0 };
  }

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

  readonly orphans = computed(() => {
    if (this.pfc.loadError()) {
      return [];
    }
    const ids = new Set(this.cohorts.value().map((c) => c.id));
    return this.pfc.programs.value().filter((p) => !ids.has(p.cursoId)).map((p) => ({ programId: p.id, projects: this.projectCount(p.id) }));
  });

  readonly withProgram = computed(() => this.cohorts.value().filter((c) => this.programByCohort().has(c.id)).length);

  readonly freeCohorts = computed(() => this.cohorts.value().filter((c) => !this.programByCohort().has(c.id)));

  // Contagem
  cohortsOf(course: Course): number {
    return this.cohorts.value().filter((c) => belongsTo(c, course)).length;
  }

  // Verificação
  isRegistered(courseName: string): boolean {
    return this.courses.value().some((c) => c.nome === courseName);
  }

  // ---------------------------------------------------------------------------
  // Erros
  // ---------------------------------------------------------------------------

  readonly actionError = signal('');
  readonly programsError = signal('');
  private readonly failCourse = (e: Error) => this.actionError.set(e.message);
  private readonly failProgram = (e: Error) => this.programsError.set(e.message);

  // Recarga
  private cohortsChanged(): void {
    this.cohorts.reload();
    this.pfc.retryLoad();
  }

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------

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
      this.cohortsChanged();
    },
    onError: this.failCourse,
  });
  private readonly removeCourseAction = action((id: string) => this.courseService.remove(id), {
    onSuccess: () => this.courses.reload(),
    onError: this.failCourse,
    concurrency: 'merge',
  });
  private readonly createCohortAction = action(
    (body: CohortBody, _done?: Done) =>
      this.cohortService.create(body).pipe(
        switchMap((cohort) =>
          this.programService.create({ cursoId: cohort.id }).pipe(
            catchError((e: Error) => {
              this.programsError.set(`A turma foi criada, mas o programa de PFC não pôde ser criado. ${e.message} Crie o programa pelo menu da turma.`);
              return of(null);
            }),
            map(() => cohort),
          ),
        ),
      ),
    {
      onSuccess: (_r, _body, done) => {
        done?.();
        this.cohortsChanged();
      },
      onError: this.failCourse,
    },
  );
  private readonly updateCohortAction = action((id: string, body: CohortChanges, _done?: Done) => this.cohortService.update(id, body), {
    onSuccess: (_r, _id, _body, done) => {
      done?.();
      this.cohortsChanged();
    },
    onError: this.failCourse,
  });
  private readonly removeCohortAction = action(
    (id: string, programId: string | null) =>
      (programId ? this.programService.remove(programId) : of(undefined)).pipe(switchMap(() => this.cohortService.remove(id))),
    {
      onSuccess: () => this.cohortsChanged(),
      onError: this.failCourse,
      concurrency: 'merge',
    },
  );
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
  readonly programCreating = computed(() => (this.createProgramAction.pending() ? this.programTarget() : null));

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  // Limpeza
  clearErrors(): void {
    this.actionError.set('');
    this.programsError.set('');
  }

  // ---------------------------------------------------------------------------
  // Cursos
  // ---------------------------------------------------------------------------

  // Criação
  createCourse(name: string, done?: Done): void {
    this.clearErrors();
    this.createCourseAction.run(name, done);
  }

  // Atualização
  updateCourse(id: string, name: string, done?: Done): void {
    this.clearErrors();
    this.updateCourseAction.run(id, name, done);
  }

  // Exclusão
  removeCourse(id: string): void {
    this.clearErrors();
    this.removeCourseAction.run(id);
  }

  // ---------------------------------------------------------------------------
  // Turmas
  // ---------------------------------------------------------------------------

  // Criação
  createCohort(body: CohortBody, done?: Done): void {
    this.clearErrors();
    this.createCohortAction.run(body, done);
  }

  // Atualização
  updateCohort(id: string, body: CohortChanges, done?: Done): void {
    this.clearErrors();
    this.updateCohortAction.run(id, body, done);
  }

  // Exclusão
  removeCohort(id: string, programId: string | null = null): void {
    this.clearErrors();
    this.removeCohortAction.run(id, programId);
  }

  // ---------------------------------------------------------------------------
  // Programas
  // ---------------------------------------------------------------------------

  // Criação
  createProgram(cohortId: string): void {
    this.clearErrors();
    this.programTarget.set(cohortId);
    this.createProgramAction.run(cohortId);
  }

  // Movimentação
  moveProgram(id: string, cohortId: string, done?: Done): void {
    this.clearErrors();
    this.moveProgramAction.run(id, cohortId, done);
  }

  // Exclusão
  removeProgram(id: string): void {
    this.clearErrors();
    this.removeProgramAction.run(id);
  }
}
