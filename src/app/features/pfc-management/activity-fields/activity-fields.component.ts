import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Tipo
export type ActivityForm = FormGroup<{
  titulo: FormControl<string>;
  prazo: FormControl<string>;
  descricao: FormControl<string>;
}>;

// Formulário
export function activityForm(): ActivityForm {
  return new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
    prazo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    descricao: new FormControl('', { nonNullable: true }),
  });
}

// Componente
@Component({
  selector: 'app-activity-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './activity-fields.component.html',
  styles: ':host { display: contents; }',
})
export class ActivityFieldsComponent {
  readonly form = input.required<ActivityForm>();
  readonly idPrefix = input.required<string>();
  readonly titlePlaceholder = input('');

  // Validação
  invalid(name: 'titulo' | 'prazo'): boolean {
    const c = this.form().controls[name];
    return c.invalid && c.touched;
  }
}
