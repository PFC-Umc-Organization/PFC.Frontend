import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

export type ActivityForm = FormGroup<{
  titulo: FormControl<string>;
  prazo: FormControl<string>;
  descricao: FormControl<string>;
}>;

export function activityForm(): ActivityForm {
  return new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
    prazo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    descricao: new FormControl('', { nonNullable: true }),
  });
}

/** Title, deadline and description, for both a new activity and an edit. */
@Component({
  selector: 'app-activity-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './activity-fields.component.html',
  styles: ':host { display: contents; }',
})
export class ActivityFieldsComponent {
  readonly form = input.required<ActivityForm>();
  /** Keeps the ids unique when both forms are on screen. */
  readonly idPrefix = input.required<string>();
  readonly titlePlaceholder = input('');

  invalid(name: 'titulo' | 'prazo'): boolean {
    const c = this.form().controls[name];
    return c.invalid && c.touched;
  }
}
