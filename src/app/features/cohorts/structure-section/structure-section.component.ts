import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, of, startWith, switchMap, tap } from 'rxjs';

import { Cohort, Course, SHIFT_LABEL, cohortLabel } from '../../../core/models';
import { CohortService } from '../../../core/services/cohort.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { CourseService } from '../../../core/services/course.service';
import { ProgramService } from '../../../core/services/program.service';
import { ProjectService } from '../../../core/services/project.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';
import { PfcManagementStore } from '../../pfc-management/pfc-management.store';
import { CohortFieldsComponent, cohortForm } from '../cohort-fields/cohort-fields.component';
import { CohortsStore } from '../cohorts.store';

const nameForm = () => new FormGroup({ nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });

interface CohortRow {
  cohort: Cohort;
  programId: string | null;
  /** undefined while the count is loading or failed, so it never reads as zero. */
  projects: number | undefined;
}

/**
 * Courses, their cohorts and each cohort's PFC program in one list: the course
 * row has the button for a new cohort and the cohort row the one for its program.
 */
@Component({
  selector: 'app-structure-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, ReactiveFormsModule, IconComponent, CohortFieldsComponent, ScrollHintDirective],
  templateUrl: './structure-section.component.html',
  styleUrl: './structure-section.component.scss',
})
export class StructureSectionComponent {
  protected readonly store = inject(CohortsStore);
  protected readonly pfc = inject(PfcManagementStore);
  private readonly courseService = inject(CourseService);
  private readonly cohortService = inject(CohortService);
  private readonly programService = inject(ProgramService);
  private readonly projectService = inject(ProjectService);
  private readonly confirmation = inject(ConfirmationService);

  protected shiftName(cohort: Cohort): string {
    return SHIFT_LABEL[cohort.turno];
  }
  protected readonly cohortLabel = cohortLabel;

  // Courses
  readonly courseForm = nameForm();
  readonly courseEditForm = nameForm();
  readonly courseName = this.courseForm.controls.nome;
  readonly courseEditName = this.courseEditForm.controls.nome;
  readonly courseCreating = signal(false);
  readonly courseFormOpen = signal(false);
  readonly editingCourseId = signal<string | null>(null);

  // Cohorts
  readonly newCohortForm = cohortForm();
  readonly cohortEditForm = cohortForm();
  /** The course (id) whose new-cohort form is open; "" is a cohort of an unregistered course. */
  readonly newCohortFor = signal<string | null>(null);
  readonly cohortCreating = signal(false);
  readonly editingCohortId = signal<string | null>(null);

  // Programs
  readonly programCreating = signal<string | null>(null);
  readonly movingProgramId = signal<string | null>(null);
  readonly moveToCohortId = signal('');

  readonly countError = signal('');
  private readonly reloadCount$ = new Subject<void>();
  /**
   * Every project of every program, only to count them; undefined while
   * loading or after a failure, so an unknown count never unlocks moving or
   * removing a program.
   */
  private readonly allProjects = toSignal(
    this.reloadCount$.pipe(
      startWith(undefined),
      tap(() => this.countError.set('')),
      switchMap(() =>
        this.projectService.list().pipe(
          catchError((e: Error) => {
            this.countError.set(e.message);
            return of(undefined);
          }),
        ),
      ),
    ),
    { initialValue: undefined },
  );

  retryCount(): void {
    this.reloadCount$.next();
  }

  private rowOf(cohort: Cohort): CohortRow {
    const program = this.pfc.programs().find((p) => p.cursoId === cohort.id);
    const projects = program ? this.allProjects()?.filter((x) => x.programaId === program.id).length : 0;
    return { cohort, programId: program?.id ?? null, projects };
  }

  private static sorted(rows: CohortRow[]): CohortRow[] {
    return rows.sort(
      (a, b) =>
        b.cohort.periodo.localeCompare(a.cohort.periodo, 'pt-BR') || a.cohort.turno.localeCompare(b.cohort.turno),
    );
  }

  /** Each course with its cohorts; by id, or by name for cohorts from before the course registry. */
  readonly groups = computed(() => {
    const cohorts = this.store.cohorts();
    const placed = new Set<string>();
    const groups = this.store.courses().map((course) => {
      const mine = cohorts.filter((c) => (c.graduacaoId ? c.graduacaoId === course.id : c.nome === course.nome));
      mine.forEach((c) => placed.add(c.id));
      return { course, rows: StructureSectionComponent.sorted(mine.map((c) => this.rowOf(c))) };
    });
    const loose = StructureSectionComponent.sorted(
      cohorts.filter((c) => !placed.has(c.id)).map((c) => this.rowOf(c)),
    );
    return { groups, loose };
  });

  /** Programs whose cohort was removed. */
  readonly orphans = computed(() => {
    if (this.pfc.loadError()) {
      return [];
    }
    const cohorts = this.store.cohorts();
    return this.pfc
      .programs()
      .filter((p) => !cohorts.some((c) => c.id === p.cursoId))
      .map((p) => ({
        programId: p.id,
        projects: this.allProjects()?.filter((x) => x.programaId === p.id).length,
      }));
  });

  readonly withProgram = computed(() => this.store.cohorts().filter((c) => this.rowOf(c).programId).length);

  /** Cohorts a program can move to: the ones without a program. */
  readonly freeCohorts = computed(() =>
    this.store.cohorts().filter((c) => !this.pfc.programs().some((p) => p.cursoId === c.id)),
  );

  invalid(control: FormControl<string>): boolean {
    return control.touched && !control.value.trim();
  }

  /** A change to the cohorts reaches the other tabs, which load their own copy. */
  private cohortsChanged(): void {
    this.store.reloadCohorts();
    this.pfc.retryLoad();
  }

  // --- Courses

  createCourse(): void {
    this.store.coursesError.set('');
    if (!this.courseName.value.trim()) {
      this.courseName.markAsTouched();
      return;
    }
    this.courseCreating.set(true);
    this.courseService.create(this.courseName.value).subscribe({
      next: () => {
        this.courseCreating.set(false);
        this.courseForm.reset({ nome: '' });
        this.courseFormOpen.set(false);
        this.store.reloadCourses();
      },
      error: (e: Error) => {
        this.courseCreating.set(false);
        this.store.coursesError.set(e.message);
      },
    });
  }

  startEditCourse(course: Course): void {
    this.store.coursesError.set('');
    this.editingCourseId.set(course.id);
    this.courseEditName.setValue(course.nome);
  }

  saveCourse(courseId: string): void {
    if (!this.courseEditName.value.trim()) {
      this.courseEditName.markAsTouched();
      return;
    }
    this.store.coursesError.set('');
    this.courseService.update(courseId, this.courseEditName.value).subscribe({
      next: () => {
        this.editingCourseId.set(null);
        this.store.reloadCourses();
        // The course's cohorts are read with the new name.
        this.cohortsChanged();
      },
      error: (e: Error) => this.store.coursesError.set(e.message),
    });
  }

  async removeCourse(course: Course): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Excluir curso',
      message: `Excluir o curso "${course.nome}"? A exclusão só é aceita se o curso não tiver turmas cadastradas. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.store.coursesError.set('');
    this.courseService.remove(course.id).subscribe({
      next: () => this.store.reloadCourses(),
      error: (e: Error) => this.store.coursesError.set(e.message),
    });
  }

  // --- Cohorts

  openNewCohort(course: Course): void {
    this.store.cohortsError.set('');
    this.editingCohortId.set(null);
    this.newCohortForm.reset({ nome: course.nome, turno: 'MANHA', periodo: '' });
    this.newCohortFor.set(course.id);
  }

  createCohort(): void {
    this.store.cohortsError.set('');
    if (this.newCohortForm.invalid) {
      this.newCohortForm.markAllAsTouched();
      return;
    }
    this.cohortCreating.set(true);
    this.cohortService.create(this.newCohortForm.getRawValue()).subscribe({
      next: () => {
        this.cohortCreating.set(false);
        this.newCohortFor.set(null);
        this.cohortsChanged();
      },
      error: (e: Error) => {
        this.cohortCreating.set(false);
        this.store.cohortsError.set(e.message);
      },
    });
  }

  startEditCohort(cohort: Cohort): void {
    this.store.cohortsError.set('');
    this.newCohortFor.set(null);
    this.cohortEditForm.setValue({
      nome: this.store.isRegistered(cohort.nome) ? cohort.nome : '',
      turno: cohort.turno,
      periodo: cohort.periodo,
    });
    this.editingCohortId.set(cohort.id);
  }

  saveCohort(cohortId: string): void {
    if (this.cohortEditForm.invalid) {
      this.cohortEditForm.markAllAsTouched();
      return;
    }
    this.cohortService.update(cohortId, this.cohortEditForm.getRawValue()).subscribe({
      next: () => {
        this.editingCohortId.set(null);
        this.cohortsChanged();
      },
      error: (e: Error) => this.store.cohortsError.set(e.message),
    });
  }

  async removeCohort(cohort: Cohort): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Excluir turma',
      message: `Excluir a turma ${cohortLabel(cohort)}? A exclusão só é aceita se a turma não tiver programa de PFC nem RGMs pré-autorizados; caso tenha, exclua o programa aqui mesmo e remova as pré-autorizações em Usuários antes. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.store.cohortsError.set('');
    this.cohortService.remove(cohort.id).subscribe({
      next: () => this.cohortsChanged(),
      error: (e: Error) => this.store.cohortsError.set(e.message),
    });
  }

  // --- Programs

  createProgram(cohortId: string): void {
    this.pfc.programsError.set('');
    this.programCreating.set(cohortId);
    this.programService.create({ cursoId: cohortId }).subscribe({
      next: () => {
        this.programCreating.set(null);
        this.pfc.reloadPrograms();
      },
      error: (e: Error) => {
        this.programCreating.set(null);
        this.pfc.programsError.set(e.message);
      },
    });
  }

  startMoveProgram(programId: string): void {
    this.pfc.programsError.set('');
    this.moveToCohortId.set('');
    this.movingProgramId.set(programId);
  }

  saveMoveProgram(programId: string): void {
    this.pfc.programsError.set('');
    this.programService.update(programId, this.moveToCohortId()).subscribe({
      next: () => {
        this.movingProgramId.set(null);
        this.pfc.reloadPrograms();
      },
      error: (e: Error) => this.pfc.programsError.set(e.message),
    });
  }

  async removeProgram(programId: string, label: string): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Excluir programa de PFC',
      message: `Excluir o programa de PFC de "${label}"? A exclusão só é aceita se nenhum PFC tiver sido cadastrado no programa. Depois dela, os alunos da turma não poderão cadastrar PFCs até que um novo programa seja criado.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.pfc.programsError.set('');
    this.programService.remove(programId).subscribe({
      next: () => this.pfc.reloadPrograms(),
      error: (e: Error) => this.pfc.programsError.set(e.message),
    });
  }
}
