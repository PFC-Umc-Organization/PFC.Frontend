import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Cohort, Course, SHIFT_LABEL, cohortLabel } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';
import { PfcManagementStore } from '../../pfc-management/pfc-management.store';
import { CohortFieldsComponent, cohortForm } from '../cohort-fields/cohort-fields.component';
import { CohortsStore } from '../cohorts.store';

const nameForm = () => new FormGroup({ nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });

/**
 * Courses, their cohorts and each cohort's PFC program in one list: the course
 * row has the button for a new cohort and the cohort row the one for its program.
 * The data and the changes are in `CohortsStore`; here is only what the screen has open.
 */
@Component({
  selector: 'app-structure-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, ReactiveFormsModule, IconComponent, CohortFieldsComponent, ScrollHintDirective],
  templateUrl: './structure-section.component.html',
  styleUrl: './structure-section.component.scss',
})
export class StructureSectionComponent implements OnInit {
  protected readonly store = inject(CohortsStore);
  protected readonly pfc = inject(PfcManagementStore);
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
  readonly courseFormOpen = signal(false);
  readonly editingCourseId = signal<string | null>(null);

  // Cohorts
  readonly newCohortForm = cohortForm();
  readonly cohortEditForm = cohortForm();
  /** The course (id) whose new-cohort form is open; "" is a cohort of an unregistered course. */
  readonly newCohortFor = signal<string | null>(null);
  readonly editingCohortId = signal<string | null>(null);

  // Programs
  readonly movingProgramId = signal<string | null>(null);
  readonly moveToCohortId = signal('');

  ngOnInit(): void {
    this.store.recount();
  }

  invalid(control: FormControl<string>): boolean {
    return control.touched && !control.value.trim();
  }

  private confirmDelete(title: string, message: string): Promise<boolean> {
    return this.confirmation.confirm({ title, message, confirmText: 'Excluir', danger: true });
  }

  // --- Courses

  createCourse(): void {
    if (!this.courseName.value.trim()) {
      this.store.clearErrors();
      this.courseName.markAsTouched();
      return;
    }
    this.store.createCourse(this.courseName.value, () => {
      this.courseForm.reset({ nome: '' });
      this.courseFormOpen.set(false);
    });
  }

  startEditCourse(course: Course): void {
    this.store.clearErrors();
    this.editingCourseId.set(course.id);
    this.courseEditName.setValue(course.nome);
  }

  saveCourse(courseId: string): void {
    if (!this.courseEditName.value.trim()) {
      this.courseEditName.markAsTouched();
      return;
    }
    this.store.updateCourse(courseId, this.courseEditName.value, () => this.editingCourseId.set(null));
  }

  async removeCourse(course: Course): Promise<void> {
    const confirmed = await this.confirmDelete(
      'Excluir curso',
      `Excluir o curso "${course.nome}"? A exclusão só é aceita se o curso não tiver turmas cadastradas. Esta ação não pode ser desfeita.`,
    );
    if (confirmed) {
      this.store.removeCourse(course.id);
    }
  }

  // --- Cohorts

  openNewCohort(course: Course): void {
    this.store.clearErrors();
    this.editingCohortId.set(null);
    this.newCohortForm.reset({ nome: course.nome, turno: 'MANHA', periodo: '' });
    this.newCohortFor.set(course.id);
  }

  createCohort(): void {
    this.store.clearErrors();
    if (this.newCohortForm.invalid) {
      this.newCohortForm.markAllAsTouched();
      return;
    }
    this.store.createCohort(this.newCohortForm.getRawValue(), () => this.newCohortFor.set(null));
  }

  startEditCohort(cohort: Cohort): void {
    this.store.clearErrors();
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
    this.store.updateCohort(cohortId, this.cohortEditForm.getRawValue(), () => this.editingCohortId.set(null));
  }

  async removeCohort(cohort: Cohort): Promise<void> {
    const confirmed = await this.confirmDelete(
      'Excluir turma',
      `Excluir a turma ${cohortLabel(cohort)}? A exclusão só é aceita se a turma não tiver programa de PFC nem RGMs pré-autorizados; caso tenha, exclua o programa aqui mesmo e remova as pré-autorizações em Usuários antes. Esta ação não pode ser desfeita.`,
    );
    if (confirmed) {
      this.store.removeCohort(cohort.id);
    }
  }

  // --- Programs

  startMoveProgram(programId: string): void {
    this.store.clearErrors();
    this.moveToCohortId.set('');
    this.movingProgramId.set(programId);
  }

  saveMoveProgram(programId: string): void {
    this.store.moveProgram(programId, this.moveToCohortId(), () => this.movingProgramId.set(null));
  }

  async removeProgram(programId: string, label: string): Promise<void> {
    const confirmed = await this.confirmDelete(
      'Excluir programa de PFC',
      `Excluir o programa de PFC de "${label}"? A exclusão só é aceita se nenhum PFC tiver sido cadastrado no programa. Depois dela, os alunos da turma não poderão cadastrar PFCs até que um novo programa seja criado.`,
    );
    if (confirmed) {
      this.store.removeProgram(programId);
    }
  }
}
