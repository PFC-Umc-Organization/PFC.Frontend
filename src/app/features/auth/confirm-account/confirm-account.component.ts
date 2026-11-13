import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AuthCardComponent } from '../auth-card/auth-card.component';

/**
 * Cognito e-mails a 6-digit code after sign-up and refuses the login until
 * it is confirmed. The e-mail comes in the query string, from the sign-up or
 * the login.
 */
@Component({
  selector: 'app-confirm-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, IconComponent],
  templateUrl: './confirm-account.component.html',
  styleUrl: '../auth.scss',
})
export class ConfirmAccountComponent {
  private readonly auth = inject(AuthService);

  private readonly confirmAction = action((email: string, code: string) => this.auth.confirm(email, code), {
    onSuccess: (r) => this.confirmed.set(r.mensagem),
    onError: (e) => this.error.set(e.message || 'Não foi possível confirmar a conta.'),
  });
  private readonly resendAction = action((email: string) => this.auth.resendCode(email), {
    onSuccess: (r) => this.notice.set(r.mensagem),
    onError: (e) => this.error.set(e.message || 'Não foi possível reenviar o código.'),
  });
  readonly loading = this.confirmAction.pending;
  readonly resending = this.resendAction.pending;
  readonly error = signal('');
  readonly notice = signal('');
  readonly confirmed = signal('');

  readonly form = inject(FormBuilder).nonNullable.group({
    email: [inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  invalid(name: 'email' | 'codigo'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  confirm(): void {
    this.error.set('');
    this.notice.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, codigo } = this.form.getRawValue();
    this.confirmAction.run(email.trim(), codigo.trim());
  }

  resend(): void {
    this.error.set('');
    this.notice.set('');
    const email = this.form.controls.email;
    if (email.invalid) {
      email.markAsTouched();
      return;
    }
    this.resendAction.run(email.value.trim());
  }
}
