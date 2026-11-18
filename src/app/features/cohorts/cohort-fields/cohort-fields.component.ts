import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Course, Shift } from '../../../core/models';

const TERM = /^\s*\d{4}\s*[./-]\s*[12]\s*$/;

// Tipo
export type CohortForm = FormGroup<{
  nome: FormControl<string>;
  turno: FormControl<Shift>;
  periodo: FormControl<string>;
}>;

// Formulário
export function cohortForm(): CohortForm {
  return new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    turno: new FormControl<Shift>('MANHA', { nonNullable: true }),
    periodo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(TERM)] }),
  });
}

// Componente
@Component({
  selector: 'app-cohort-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './cohort-fields.component.html',
  styles: ':host { display: contents; }',
})
export class CohortFieldsComponent {
  readonly form = input.required<CohortForm>();
  readonly courses = input.required<Course[]>();
  readonly idPrefix = input.required<string>();
  readonly hideCourse = input(false);

  // Validação
  invalid(name: 'nome' | 'periodo'): boolean {
    const c = this.form().controls[name];
    return c.invalid && c.touched;
  }
}
