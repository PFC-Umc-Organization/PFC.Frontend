import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserService } from '../../../core/services/user.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** An advisor or coordination account; Cognito e-mails the temporary password. */
@Component({
  selector: 'app-account-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './account-form.component.html',
})
export class AccountFormComponent {
  private readonly userService = inject(UserService);

  readonly form = inject(FormBuilder).nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/@umc\.br$/i)]],
    perfil: ['ORIENTADOR' as 'ORIENTADOR' | 'ADMIN', [Validators.required]],
  });
  readonly saving = signal(false);
  readonly error = signal('');
  readonly closed = output();
  /** With the backend's confirmation message. */
  readonly created = output<string>();

  invalid(name: 'nome' | 'email'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  create(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.userService.createAccount(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.form.reset({ nome: '', email: '', perfil: 'ORIENTADOR' });
        this.created.emit(response.mensagem);
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.error.set(e.message);
      },
    });
  }
}
