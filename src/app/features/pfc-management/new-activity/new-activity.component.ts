import { ChangeDetectionStrategy, Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';

import { Cohort, DEFAULT_FIELD, NewField, cohortLabel } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ActivityFieldsComponent, activityForm } from '../activity-fields/activity-fields.component';
import { FieldAdderComponent } from '../field-adder/field-adder.component';
import { FieldListComponent } from '../field-list/field-list.component';
import { PfcManagementStore } from '../pfc-management.store';

// Constante
export const ALL_COHORTS = 'TODAS';

// Componente
@Component({
  selector: 'app-new-activity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, ActivityFieldsComponent, FieldListComponent, FieldAdderComponent],
  templateUrl: './new-activity.component.html',
})
export class NewActivityComponent {
  private readonly activityService = inject(ActivityService);
  private readonly adder = viewChild.required(FieldAdderComponent);
  private readonly store = inject(PfcManagementStore);

  protected readonly cohortLabel = cohortLabel;
  protected readonly allCohorts = ALL_COHORTS;
  protected readonly cohorts = this.store.cohorts.value;
  private readonly chosen = signal<string | null>(null);
  readonly target = computed(() => this.chosen() ?? (this.store.cohortId() || ALL_COHORTS));

  // Seleção
  chooseTarget(event: Event): void {
    this.chosen.set((event.target as HTMLSelectElement).value);
  }

  readonly form = activityForm();
  readonly fields = signal<NewField[]>([{ ...DEFAULT_FIELD }]);
  readonly closed = output();
  readonly created = output();
  private readonly missingCohort = signal('');
  private readonly failure = signal('');
  private readonly publishAction = action(
    (targets: Cohort[], body: Parameters<ActivityService['create']>[0]) =>
      forkJoin(
        targets.map((cohort) =>
          this.activityService.create({ ...body, turmaId: cohort.id }).pipe(
            map(() => null),
            catchError((e: Error) => of({ cohort, message: e.message })),
          ),
        ),
      ),
    {
      onSuccess: (results, targets) => {
        const failures = results.filter((r) => r !== null);
        if (failures.length === 0) {
          this.form.reset();
          this.fields.set([{ ...DEFAULT_FIELD }]);
          this.created.emit();
          return;
        }
        const names = failures.map((f) => cohortLabel(f.cohort)).join(', ');
        this.failure.set(
          failures.length === targets.length
            ? failures[0].message
            : `A atividade foi criada, mas não nas turmas: ${names}. ${failures[0].message}`,
        );
      },
    },
  );
  readonly saving = this.publishAction.pending;
  readonly error = computed(() => this.missingCohort() || this.failure());

  // Inclusão
  addField(field: NewField): void {
    this.fields.update((fields) => [...fields, field]);
    this.adder().reset();
  }

  // Remoção
  removeField(index: number): void {
    this.fields.update((fields) => (fields.length <= 1 ? fields : fields.filter((_, i) => i !== index)));
  }

  // Publicação
  publish(): void {
    this.missingCohort.set('');
    this.failure.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const targets = this.target() === ALL_COHORTS ? this.cohorts() : this.cohorts().filter((c) => c.id === this.target());
    if (!targets.length) {
      this.missingCohort.set('Cadastre uma turma antes de criar atividades.');
      return;
    }
    this.publishAction.run(targets, { ...this.form.getRawValue(), campos: this.fields() });
  }
}
