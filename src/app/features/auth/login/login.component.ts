import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ApiError } from '../../../core/services/http-error';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PasswordFieldComponent } from '../../../shared/components/password-field/password-field.component';
import { AuthCardComponent } from '../auth-card/auth-card.component';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, PasswordFieldComponent, IconComponent],
  templateUrl: './login.component.html',
  styles: '.forgot { justify-self: center; }',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  /** The page the person tried to open before landing here. */
  private readonly returnTo = inject(ActivatedRoute).snapshot.queryParamMap.get('retorno');

  readonly loading = signal(false);
  readonly error = signal('');
  /** Refused because the account still waits for the e-mail code (403). */
  readonly unconfirmed = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  invalid(name: 'email' | 'senha'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  signIn(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth.signIn(this.form.getRawValue()).subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result === 'new-password') {
          void this.router.navigate(['/nova-senha']);
          return;
        }
        void this.router.navigateByUrl(this.destination());
      },
      error: (e: ApiError) => {
        this.loading.set(false);
        this.unconfirmed.set(e.status === 403);
        this.error.set(e.message || 'Não foi possível entrar.');
      },
    });
  }

  /** Internal paths only: an outside `retorno` would be an open redirect. */
  private destination(): string {
    const r = this.returnTo;
    return r && r.startsWith('/') && !r.startsWith('//') ? r : '/';
  }
}
