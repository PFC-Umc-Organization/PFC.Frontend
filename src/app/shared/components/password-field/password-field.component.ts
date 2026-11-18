import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { IconComponent } from '../icon/icon.component';

// Componente
@Component({
  selector: 'app-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './password-field.component.html',
})
export class PasswordFieldComponent {
  readonly fieldId = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly placeholder = input('••••••••');
  readonly invalid = input(false);
  readonly withIcon = input(false);
  readonly describedBy = input('');

  readonly visible = signal(false);
}
