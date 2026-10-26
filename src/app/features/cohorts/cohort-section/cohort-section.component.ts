import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { Cohort, SHIFT_LABEL } from '../../../core/models';
import { CohortService } from '../../../core/services/cohort.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CohortFieldsComponent, cohortForm } from '../cohort-fields/cohort-fields.component';
import { CohortsStore } from '../cohorts.store';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

@Component({
  selector: 'app-cohort-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, CohortFieldsComponent, ScrollHintDirective],
  templateUrl: './cohort-section.component.html',
  styleUrl: './cohort-section.component.scss',
})
export class CohortSectionComponent {
  protected readonly store = inject(CohortsStore);
  private readonly cohortService = inject(CohortService);
  private readonly confirmation = inject(ConfirmationService);

  readonly goToCourses = output();
  protected readonly shiftLabel = SHIFT_LABEL;

  readonly newForm = cohortForm();
  readonly editForm = cohortForm();
  readonly creating = signal(false);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);

  /** The course name; "" is all of them. */
  readonly courseFilter = signal('');
  readonly visible = computed(() =>
    this.courseFilter() ? this.store.cohorts().filter((c) => c.nome === this.courseFilter()) : this.store.cohorts(),
  );

  create(): void {
    this.store.cohortsError.set('');
    if (this.newForm.invalid) {
      this.newForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.cohortService.create(this.newForm.getRawValue()).subscribe({
      next: () => {
        this.creating.set(false);
        this.newForm.reset({ nome: '', turno: 'MANHA', periodo: '' });
        this.formOpen.set(false);
        this.store.reloadCohorts();
      },
      error: (e: Error) => {
        this.creating.set(false);
        this.store.cohortsError.set(e.message);
      },
    });
  }

  startEdit(cohort: Cohort): void {
    this.store.cohortsError.set('');
    this.editingId.set(cohort.id);
    this.editForm.setValue({
      nome: this.store.isRegistered(cohort.nome) ? cohort.nome : '',
      turno: cohort.turno,
      periodo: cohort.periodo,
    });
  }

  saveEdit(cohortId: string): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.cohortService.update(cohortId, this.editForm.getRawValue()).subscribe({
      next: () => {
        this.editingId.set(null);
        this.store.reloadCohorts();
      },
      error: (e: Error) => this.store.cohortsError.set(e.message),
    });
  }

  async remove(cohortId: string, name: string): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Excluir turma',
      message: `Excluir a turma de "${name}"? Essa ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.store.cohortsError.set('');
    this.cohortService.remove(cohortId).subscribe({
      next: () => this.store.reloadCohorts(),
      error: (e: Error) => this.store.cohortsError.set(e.message),
    });
  }
}
