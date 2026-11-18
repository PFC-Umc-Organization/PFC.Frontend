import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Cohort, EnrollmentResult, cohortLabel, currentTerm, isInTerm } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RgmInputDirective } from '../../../shared/directives/rgm-input.directive';

// Componente
@Component({
  selector: 'app-enroll-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, RgmInputDirective],
  templateUrl: './enroll-form.component.html',
  styles: '.failures { margin: 0.25rem 0 0; padding-left: 1.25rem; }',
})
export class EnrollFormComponent {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly confirmation = inject(ConfirmationService);

  readonly cohorts = input.required<Cohort[]>();
  readonly cohortId = input('');
  readonly enrolledIn = output<string>();
  protected readonly cohortLabel = cohortLabel;
  protected readonly term = currentTerm();

  readonly termCohorts = computed(() => this.cohorts().filter((c) => isInTerm(c, this.term)));

  readonly form = inject(FormBuilder).nonNullable.group({
    turmaId: ['', [Validators.required]],
    rgms: ['', [Validators.required]],
  });
  readonly result = signal<EnrollmentResult | null>(null);
  private readonly enrollAction = action(
    (rgms: string[], turmaId: string) => this.enrollmentService.enroll(rgms, turmaId),
    {
      onSuccess: (result, _rgms, turmaId) => {
        this.form.reset({ turmaId: '', rgms: '' });
        this.enrolledIn.emit(turmaId);
        if (result.falhas.length === 0) {
          this.created.emit(result.processados === 1 ? '1 RGM pré-autorizado.' : `${result.processados} RGMs pré-autorizados.`);
        } else {
          this.result.set(result);
        }
      },
    },
  );
  readonly saving = this.enrollAction.pending;
  private readonly invalidInput = signal('');
  readonly error = computed(() => this.invalidInput() || this.enrollAction.error() || '');
  readonly closed = output();
  readonly created = output<string>();

  // Inicialização
  constructor() {
    effect(() => {
      const id = this.cohortId();
      if (this.termCohorts().some((c) => c.id === id)) {
        untracked(() => this.form.controls.turmaId.setValue(id));
      }
    });
  }

  // Validação
  invalid(name: 'turmaId' | 'rgms'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

<<<<<<< HEAD
  // Pré-autorização
  enroll(): void {
=======
  async enroll(): Promise<void> {
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
    this.result.set(null);
    this.invalidInput.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { turmaId, rgms: text } = this.form.getRawValue();
    const rgms = [...new Set(text.split(/[\s,;]+/).filter((r) => /^\d{11}$/.test(r)))];
    if (rgms.length === 0) {
      this.invalidInput.set('Informe ao menos um RGM válido (11 números).');
      return;
    }
    const cohort = this.termCohorts().find((c) => c.id === turmaId);
    const confirmed = await this.confirmation.confirm({
      title: 'Pré-autorizar RGMs',
      message: `Pré-autorizar ${rgms.length === 1 ? '1 RGM' : rgms.length + ' RGMs'} ${cohort ? 'na turma ' + cohortLabel(cohort) : 'na turma escolhida'}? Os alunos poderão criar a conta com esses RGMs.`,
      confirmText: 'Pré-autorizar',
    });
    if (!confirmed) {
      return;
    }
    this.enrollAction.run(rgms, turmaId);
  }
}
