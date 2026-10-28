import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Cohort, EnrollmentResult, cohortLabel, currentTerm, isInTerm } from '../../../core/models';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Pre-authorizes RGMs in a cohort; the students then create their own accounts. */
@Component({
  selector: 'app-enroll-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './enroll-form.component.html',
  styles: '.failures { margin: 0.25rem 0 0; padding-left: 1.25rem; }',
})
export class EnrollFormComponent {
  private readonly enrollmentService = inject(EnrollmentService);

  readonly cohorts = input.required<Cohort[]>();
  /** The cohort shown in the list; the form starts on it when it is from this term. */
  readonly cohortId = input('');
  readonly enrolledIn = output<string>();
  protected readonly cohortLabel = cohortLabel;
  protected readonly term = currentTerm();

  /** Only this term's cohorts; older ones stay in the enrolled list. */
  readonly termCohorts = computed(() => this.cohorts().filter((c) => isInTerm(c, this.term)));

  readonly form = inject(FormBuilder).nonNullable.group({
    turmaId: ['', [Validators.required]],
    rgms: ['', [Validators.required]],
  });
  readonly saving = signal(false);
  readonly result = signal<EnrollmentResult | null>(null);
  readonly error = signal('');
  readonly closed = output();
  /** Only when every RGM went in; with failures the form stays open to show them. */
  readonly created = output<string>();

  constructor() {
    effect(() => {
      const id = this.cohortId();
      if (this.termCohorts().some((c) => c.id === id)) {
        untracked(() => this.form.controls.turmaId.setValue(id));
      }
    });
  }

  invalid(name: 'turmaId' | 'rgms'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  enroll(): void {
    this.result.set(null);
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { turmaId, rgms: text } = this.form.getRawValue();
    const rgms = [...new Set(text.split(/[\s,;]+/).filter((r) => /^\d{4,12}$/.test(r)))];
    if (rgms.length === 0) {
      this.error.set('Informe ao menos um RGM válido (só números).');
      return;
    }
    this.saving.set(true);
    this.enrollmentService.enroll(rgms, turmaId).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.form.reset({ turmaId: '', rgms: '' });
        this.enrolledIn.emit(turmaId);
        if (result.falhas.length === 0) {
          this.created.emit(result.processados === 1 ? '1 RGM pré-autorizado.' : `${result.processados} RGMs pré-autorizados.`);
        } else {
          this.result.set(result);
        }
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.error.set(e.message || 'Não foi possível pré-autorizar os RGMs.');
      },
    });
  }
}
