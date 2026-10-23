import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserService } from '../../../core/services/user.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** An advisor or admin account; Cognito e-mails the invitation. */
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
  readonly success = signal('');
  readonly error = signal('');

  invalid(name: 'nome' | 'email'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  create(): void {
    this.success.set('');
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.userService.createAccount(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.success.set(response.mensagem);
        this.form.reset({ nome: '', email: '', perfil: 'ORIENTADOR' });
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.error.set(e.message);
      },
    });
  }
}
