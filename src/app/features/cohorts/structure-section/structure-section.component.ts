import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Cohort, Course, SHIFT_LABEL, cohortLabel } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RowMenuComponent, RowMenuItem } from '../../../shared/components/row-menu/row-menu.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';
import { PfcManagementStore } from '../../pfc-management/pfc-management.store';
import { CohortFieldsComponent, cohortForm } from '../cohort-fields/cohort-fields.component';
import { CohortRow, CohortsStore } from '../cohorts.store';

// Formulário
const nameForm = () => new FormGroup({ nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });

// Componente
@Component({
  selector: 'app-structure-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, ReactiveFormsModule, RouterLink, IconComponent, RowMenuComponent, CohortFieldsComponent, ScrollHintDirective],
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

  // ---------------------------------------------------------------------------
  // Ciclo e apoio
  // ---------------------------------------------------------------------------

  // Inicialização
  ngOnInit(): void {
    this.store.recount();
  }

  // ---------------------------------------------------------------------------
  // Menus
  // ---------------------------------------------------------------------------

  // Curso
  courseMenu(rows: number): RowMenuItem[] {
    return [
      { id: 'rename', label: 'Renomear' },
      {
        id: 'remove',
        label: 'Excluir',
        danger: true,
        disabled: rows > 0 || this.store.busy(),
        hint: rows > 0 ? 'Remova as turmas do curso antes de excluí-lo' : undefined,
      },
    ];
  }

  // Turma
  cohortMenu(row: CohortRow): RowMenuItem[] {
    const items: RowMenuItem[] = [{ id: 'edit', label: 'Editar' }];
    if (!row.programId && !this.pfc.loadError()) {
      items.push({ id: 'program', label: 'Criar programa de PFC', disabled: this.store.busy() });
    }
    items.push({
      id: 'remove',
      label: 'Excluir',
      danger: true,
      disabled: this.store.busy() || (row.projects ?? 1) > 0,
      hint: (row.projects ?? 1) > 0 ? 'Não é possível excluir uma turma cujo programa já tem PFCs' : undefined,
    });
    return items;
  }

  // Escolha
  chooseCourse(course: Course, id: string): void {
    if (id === 'rename') {
      this.startEditCourse(course);
    } else {
      void this.removeCourse(course);
    }
  }

  chooseCohort(row: CohortRow, id: string): void {
    if (id === 'edit') {
      this.startEditCohort(row.cohort);
    } else if (id === 'program') {
      void this.createProgram(row.cohort);
    } else {
      void this.removeCohort(row);
    }
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
  private confirmSave(title: string, message: string, confirmText = 'Salvar'): Promise<boolean> {
    return this.confirmation.confirm({ title, message, confirmText });
  }

  private label(form: { nome: string; turno: Cohort['turno']; periodo: string }): string {
    return `${form.nome.trim()} (${SHIFT_LABEL[form.turno]}, ${form.periodo.trim()})`;
  }

  // --- Courses

  async createCourse(): Promise<void> {
    if (!this.courseName.value.trim()) {
      this.store.clearErrors();
      this.courseName.markAsTouched();
      return;
    }
    if (!(await this.confirmSave('Criar curso', `Criar o curso "${this.courseName.value.trim()}"?`, 'Criar'))) {
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
  async saveCourse(courseId: string): Promise<void> {
    if (!this.courseEditName.value.trim()) {
      this.courseEditName.markAsTouched();
      return;
    }
    if (!(await this.confirmSave('Salvar curso', `Renomear o curso para "${this.courseEditName.value.trim()}"?`))) {
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
  async createCohort(): Promise<void> {
    this.store.clearErrors();
    if (this.newCohortForm.invalid) {
      this.newCohortForm.markAllAsTouched();
      return;
    }
    const message = `Criar a turma ${this.label(this.newCohortForm.getRawValue())}? O programa de PFC é criado junto, e os alunos da turma já podem cadastrar projetos.`;
    if (!(await this.confirmSave('Criar turma', message, 'Criar'))) {
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
  async saveCohort(cohortId: string): Promise<void> {
    if (this.cohortEditForm.invalid) {
      this.cohortEditForm.markAllAsTouched();
      return;
    }
    if (!(await this.confirmSave('Salvar turma', `Salvar a turma como ${this.label(this.cohortEditForm.getRawValue())}?`))) {
      return;
    }
    this.store.updateCohort(cohortId, this.cohortEditForm.getRawValue(), () => this.editingCohortId.set(null));
  }

  // Exclusão
  async removeCohort(row: CohortRow): Promise<void> {
    const programNote = row.programId ? ' O programa de PFC da turma, que não tem projetos, também é excluído.' : '';
    const confirmed = await this.confirmDelete(
      'Excluir turma',
      `Excluir a turma ${cohortLabel(row.cohort)}?${programNote} A exclusão só é aceita se a turma não tiver RGMs pré-autorizados; remova as pré-autorizações em Usuários antes. Esta ação não pode ser desfeita.`,
    );
    if (confirmed) {
      this.store.removeCohort(row.cohort.id, row.programId);
    }
  }

  // ---------------------------------------------------------------------------
  // Programas
  // ---------------------------------------------------------------------------

  // Criação
  async createProgram(cohort: Cohort): Promise<void> {
    const message = `Criar o programa de PFC da turma ${cohortLabel(cohort)}? Depois disso, os alunos da turma já podem cadastrar o PFC do grupo.`;
    if (await this.confirmSave('Criar programa de PFC', message, 'Criar')) {
      this.store.createProgram(cohort.id);
    }
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
