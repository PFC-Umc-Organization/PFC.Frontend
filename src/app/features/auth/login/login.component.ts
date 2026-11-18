import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { from, map, switchMap } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { action } from '../../../core/state/action';
import { ApiError } from '../../../core/services/http-error';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PasswordFieldComponent } from '../../../shared/components/password-field/password-field.component';
import { AuthCardComponent } from '../auth-card/auth-card.component';

// Componente
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, PasswordFieldComponent, IconComponent],
  templateUrl: './login.component.html',
  styles: '.password-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; } .forgot { font-size: 0.8125rem; } .qr { display: block; margin-inline: auto; } .secret { display: block; margin-top: 0.25rem; word-break: break-all; }',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly returnTo = this.query.get('retorno');
  readonly expired = this.query.get('motivo') === 'sessao-expirada';

  private readonly signInAction = action((credentials: Parameters<AuthService['signIn']>[0]) => this.auth.signIn(credentials), {
    onSuccess: (result) => {
      if (result === 'new-password') {
        void this.router.navigate(['/nova-senha']);
        return;
      }
      if (result === 'MFA_SETUP') {
        this.step.set('mfa-setup');
        this.setupAction.run();
        return;
      }
      if (result === 'SOFTWARE_TOKEN_MFA') {
        this.step.set('mfa-code');
        return;
      }
      void this.router.navigateByUrl(this.destination());
    },
    onError: (e) => {
      this.unconfirmed.set((e as ApiError).status === 403);
      this.error.set(e.message || 'Não foi possível entrar.');
    },
  });
  readonly step = signal<'credentials' | 'mfa-setup' | 'mfa-code'>('credentials');

  private readonly setupAction = action(
    () =>
      this.auth.startMfaSetup().pipe(
        switchMap((setup) =>
          from(import('qrcode').then((qr) => qr.toDataURL(setup.uri, { width: 192, margin: 1 }))).pipe(
            map((qrCode) => ({ ...setup, qrCode })),
          ),
        ),
      ),
    {
      onSuccess: ({ secret, qrCode }) => {
        this.secret.set(secret);
        this.qrCode.set(qrCode);
      },
      onError: (e) => this.error.set(e.message || 'Não foi possível iniciar a configuração do autenticador.'),
    },
  );
  readonly settingUp = this.setupAction.pending;
  readonly secret = signal('');
  readonly qrCode = signal('');

  private readonly verifyAction = action((code: string) => this.auth.verifyMfa(code), {
    onSuccess: () => void this.router.navigateByUrl(this.destination()),
    onError: (e) => this.error.set(e.message || 'Não foi possível validar o código.'),
  });
  readonly verifying = this.verifyAction.pending;

  readonly loading = this.signInAction.pending;
  readonly error = signal('');
  readonly unconfirmed = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  readonly mfaForm = inject(FormBuilder).nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // Validação
  invalid(name: 'email' | 'senha'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  // Entrada
  signIn(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.signInAction.run(this.form.getRawValue());
  }

  // ---------------------------------------------------------------------------
  // MFA
  // ---------------------------------------------------------------------------

  // Código
  codeInvalid(): boolean {
    const c = this.mfaForm.controls.codigo;
    return c.invalid && c.touched;
  }

  // Verificação
  verify(): void {
    this.error.set('');
    if (this.mfaForm.invalid) {
      this.mfaForm.markAllAsTouched();
      return;
    }
    this.verifyAction.run(this.mfaForm.controls.codigo.value);
  }

  // Retorno
  backToCredentials(): void {
    this.auth.cancelChallenge();
    this.error.set('');
    this.secret.set('');
    this.qrCode.set('');
    this.mfaForm.reset();
    this.step.set('credentials');
  }

  // Nova tentativa
  retrySetup(): void {
    this.error.set('');
    this.setupAction.run();
  }

  // ---------------------------------------------------------------------------
  // Destino
  // ---------------------------------------------------------------------------

  // Destino
  private destination(): string {
    const r = this.returnTo;
    return r && r.startsWith('/') && !r.startsWith('//') ? r : '/';
  }
}
