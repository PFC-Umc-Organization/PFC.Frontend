import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { PASSWORD_HINT, PASSWORD_RULE } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PasswordFieldComponent } from '../../../shared/components/password-field/password-field.component';
import { AuthCardComponent } from '../auth-card/auth-card.component';

/** A student's own sign-up; the RGM must be pre-authorized. */
@Component({
  selector: 'app-sign-up',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, PasswordFieldComponent, IconComponent],
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly signUpAction = action((body: Parameters<AuthService['signUp']>[0]) => this.auth.signUp(body), {
    // Cognito already sent the code: go to the confirmation with the e-mail filled in.
    onSuccess: (_r, body) =>
      void this.router.navigate(['/confirmar-conta'], { queryParams: { email: body.email.trim().toLowerCase() } }),
    onError: (e) => this.error.set(e.message || 'Não foi possível criar a conta.'),
  });
  readonly loading = this.signUpAction.pending;
  readonly error = signal('');
  protected readonly passwordHint = PASSWORD_HINT;

  /** Cognito's rules: the password policy and the Pre Sign-up's `<rgm>@alunos.umc.br`. */
  readonly form = inject(FormBuilder).nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.pattern(/^\d+@alunos\.umc\.br$/i)]],
    senha: ['', [Validators.required, Validators.pattern(PASSWORD_RULE)]],
  });

  invalid(name: 'nome' | 'email' | 'senha'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  signUp(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nome, email, senha } = this.form.getRawValue();
    this.signUpAction.run({ nome, email, senha, perfil: 'ALUNO' });
  }
}
