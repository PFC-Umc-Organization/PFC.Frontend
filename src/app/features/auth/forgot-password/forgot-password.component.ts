import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PASSWORD_HINT, PASSWORD_RULE } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PasswordFieldComponent } from '../../../shared/components/password-field/password-field.component';
import { AuthCardComponent } from '../auth-card/auth-card.component';
import { passwordsMatch } from '../passwords-match';

/** Two steps: ask for the code, then use it with the new password. */
@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, PasswordFieldComponent, IconComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../auth.scss'],
  styles: '.form--inner { margin-top: 0; }',
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly codeSent = signal(false);
  readonly done = signal('');
  protected readonly passwordHint = PASSWORD_HINT;

  readonly request = this.fb.group({
    email: [inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
  });

  readonly reset = this.fb.group(
    {
      codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      senha: ['', [Validators.required, Validators.pattern(PASSWORD_RULE)]],
      confirmacao: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  readonly subtitle = computed(() =>
    this.codeSent()
      ? 'Digite o código enviado por e-mail e defina a nova senha.'
      : 'Informe o e-mail da sua conta. Enviaremos um código para você definir uma nova senha.',
  );

  touchedInvalid(control: { invalid: boolean; touched: boolean }): boolean {
    return control.invalid && control.touched;
  }

  mismatch(): boolean {
    return this.reset.hasError('diferentes') && this.reset.controls.confirmacao.touched;
  }

  sendCode(): void {
    this.error.set('');
    this.notice.set('');
    if (this.request.invalid) {
      this.request.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.forgotPassword(this.request.controls.email.value.trim()).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.notice.set(r.mensagem);
        this.codeSent.set(true);
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message || 'Não foi possível enviar o código.');
      },
    });
  }

  resetPassword(): void {
    this.error.set('');
    this.notice.set('');
    if (this.reset.invalid) {
      this.reset.markAllAsTouched();
      return;
    }
    const { codigo, senha } = this.reset.getRawValue();
    this.loading.set(true);
    this.auth.resetPassword(this.request.controls.email.value.trim(), codigo.trim(), senha).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.done.set(r.mensagem);
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message || 'Não foi possível redefinir a senha.');
      },
    });
  }

  changeEmail(): void {
    this.codeSent.set(false);
    this.notice.set('');
    this.error.set('');
    this.reset.reset();
  }
}
