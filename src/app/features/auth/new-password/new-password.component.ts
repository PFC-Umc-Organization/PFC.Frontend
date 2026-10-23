import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { PASSWORD_HINT, PASSWORD_RULE } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PasswordFieldComponent } from '../../../shared/components/password-field/password-field.component';
import { AuthCardComponent } from '../auth-card/auth-card.component';
import { passwordsMatch } from '../passwords-match';

/**
 * An advisor's or admin's first sign-in: the account created by the
 * coordination comes with a temporary password that Cognito makes them replace.
 */
@Component({
  selector: 'app-new-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, PasswordFieldComponent, IconComponent],
  templateUrl: './new-password.component.html',
  styleUrl: '../auth.scss',
})
export class NewPasswordComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');
  protected readonly passwordHint = PASSWORD_HINT;

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      senha: ['', [Validators.required, Validators.pattern(PASSWORD_RULE)]],
      confirmacao: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  passwordInvalid(): boolean {
    const c = this.form.controls.senha;
    return c.invalid && c.touched;
  }

  mismatch(): boolean {
    return this.form.hasError('diferentes') && this.form.controls.confirmacao.touched;
  }

  save(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.setNewPassword(this.form.controls.senha.value).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/']);
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message || 'Não foi possível salvar a senha.');
      },
    });
  }
}
