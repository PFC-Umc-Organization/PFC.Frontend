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

// Formulário
const nameForm = () => new FormGroup({ nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });

// Componente
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

  // ---------------------------------------------------------------------------
  // Apoio
  // ---------------------------------------------------------------------------

  // Nome
  protected shiftName(cohort: Cohort): string {
    return SHIFT_LABEL[cohort.turno];
  }
  protected readonly cohortLabel = cohortLabel;

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------

  readonly courseForm = nameForm();
  readonly courseEditForm = nameForm();
  readonly courseName = this.courseForm.controls.nome;
  readonly courseEditName = this.courseEditForm.controls.nome;
  readonly courseFormOpen = signal(false);
  readonly editingCourseId = signal<string | null>(null);

  readonly newCohortForm = cohortForm();
  readonly cohortEditForm = cohortForm();
  readonly newCohortFor = signal<string | null>(null);
  readonly editingCohortId = signal<string | null>(null);

  readonly movingProgramId = signal<string | null>(null);
  readonly moveToCohortId = signal('');

  // ---------------------------------------------------------------------------
  // Ciclo e apoio
  // ---------------------------------------------------------------------------

  // Inicialização
  ngOnInit(): void {
    this.store.recount();
  }

  // Validação
  invalid(control: FormControl<string>): boolean {
    return control.touched && !control.value.trim();
  }

  // Confirmação
  private confirmDelete(title: string, message: string): Promise<boolean> {
    return this.confirmation.confirm({ title, message, confirmText: 'Excluir', danger: true });
  }

  // ---------------------------------------------------------------------------
  // Cursos
  // ---------------------------------------------------------------------------

  // Criação
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

  // Edição
  startEditCourse(course: Course): void {
    this.store.clearErrors();
    this.editingCourseId.set(course.id);
    this.courseEditName.setValue(course.nome);
  }

  // Gravação
  saveCourse(courseId: string): void {
    if (!this.courseEditName.value.trim()) {
      this.courseEditName.markAsTouched();
      return;
    }
    this.store.updateCourse(courseId, this.courseEditName.value, () => this.editingCourseId.set(null));
  }

  // Exclusão
  async removeCourse(course: Course): Promise<void> {
    const confirmed = await this.confirmDelete(
      'Excluir curso',
      `Excluir o curso "${course.nome}"? A exclusão só é aceita se o curso não tiver turmas cadastradas. Esta ação não pode ser desfeita.`,
    );
    if (confirmed) {
      this.store.removeCourse(course.id);
    }
  }

  // ---------------------------------------------------------------------------
  // Turmas
  // ---------------------------------------------------------------------------

  // Abertura
  openNewCohort(course: Course): void {
    this.store.clearErrors();
    this.editingCohortId.set(null);
    this.newCohortForm.reset({ nome: course.nome, turno: 'MANHA', periodo: '' });
    this.newCohortFor.set(course.id);
  }

  // Criação
  createCohort(): void {
    this.store.clearErrors();
    if (this.newCohortForm.invalid) {
      this.newCohortForm.markAllAsTouched();
      return;
    }
    this.store.createCohort(this.newCohortForm.getRawValue(), () => this.newCohortFor.set(null));
  }

  // Edição
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

  // Gravação
  saveCohort(cohortId: string): void {
    if (this.cohortEditForm.invalid) {
      this.cohortEditForm.markAllAsTouched();
      return;
    }
    this.store.updateCohort(cohortId, this.cohortEditForm.getRawValue(), () => this.editingCohortId.set(null));
  }

  // Exclusão
  async removeCohort(cohort: Cohort): Promise<void> {
    const confirmed = await this.confirmDelete(
      'Excluir turma',
      `Excluir a turma ${cohortLabel(cohort)}? A exclusão só é aceita se a turma não tiver programa de PFC nem RGMs pré-autorizados; caso tenha, exclua o programa aqui mesmo e remova as pré-autorizações em Usuários antes. Esta ação não pode ser desfeita.`,
    );
    if (confirmed) {
      this.store.removeCohort(cohort.id);
    }
  }

  // ---------------------------------------------------------------------------
  // Programas
  // ---------------------------------------------------------------------------

  // Movimentação
  startMoveProgram(programId: string): void {
    this.store.clearErrors();
    this.moveToCohortId.set('');
    this.movingProgramId.set(programId);
  }

  // Gravação
  saveMoveProgram(programId: string): void {
    this.store.moveProgram(programId, this.moveToCohortId(), () => this.movingProgramId.set(null));
  }

  // Exclusão
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
