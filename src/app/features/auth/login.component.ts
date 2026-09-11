import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { SENHA_MOCK } from '../../core/services/dados-mock';
import { IconeComponent } from '../../shared/components/icone.component';
import { AuthCardComponent } from './auth-card.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthCardComponent,
    IconeComponent,
  ],
  template: `
    <app-auth-card
      titulo="Entrar"
      subtitulo="Use seu e-mail institucional para acessar a plataforma."
    >
      <form class="form" [formGroup]="form" (ngSubmit)="entrar()">
        @if (erro()) {
          <p class="alerta" role="alert">
            <app-icone nome="alerta" />
            <span>{{ erro() }}</span>
          </p>
        }

        <div class="field">
          <label class="field__label" for="email">E-mail</label>
          <div class="control-wrap">
            <app-icone nome="email" class="control-wrap__icon" />
            <input
              id="email"
              type="email"
              class="control"
              placeholder="voce@athena.edu"
              autocomplete="username"
              formControlName="email"
              [class.control--invalid]="invalido('email')"
            />
          </div>
          @if (invalido('email')) {
            <span class="field__error">Informe um e-mail válido.</span>
          }
        </div>

        <div class="field">
          <label class="field__label" for="senha">Senha</label>
          <div class="control-wrap">
            <app-icone nome="cadeado" class="control-wrap__icon" />
            <input
              id="senha"
              type="password"
              class="control"
              placeholder="••••••••"
              autocomplete="current-password"
              formControlName="senha"
              [class.control--invalid]="invalido('senha')"
            />
          </div>
          @if (invalido('senha')) {
            <span class="field__error">Informe sua senha.</span>
          }
        </div>

        <button type="button" class="link-button">Esqueci minha senha</button>

        <button
          type="submit"
          class="btn btn--primary btn--block"
          [disabled]="carregando()"
        >
          {{ carregando() ? 'Entrando…' : 'Entrar' }}
        </button>

        <p class="troca">
          Não tem uma conta?
          <a routerLink="/criar-conta">Criar conta</a>
        </p>

        <aside class="dica">
          <strong>Ambiente de demonstração</strong>
          Entre com <code>pedro.silva&#64;athena.edu</code> (aluno) ou
          <code>alessandro.horas&#64;athena.edu</code> (professor). Senha:
          <code>{{ senhaDemo }}</code>
        </aside>
      </form>
    </app-auth-card>
  `,
  styles: `
    .form {
      display: grid;
      gap: 1.25rem;
      margin-top: 1.75rem;
    }

    .alerta {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--destructive);
      background: color-mix(in oklch, var(--destructive) 6%, transparent);
      border: 1px solid
        color-mix(in oklch, var(--destructive) 30%, transparent);
    }

    .troca {
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    .dica {
      display: grid;
      gap: 0.25rem;
      padding: 0.875rem;
      font-size: 0.75rem;
      line-height: 1.6;
      color: var(--muted-foreground);
      background: var(--muted);
      border-left: 3px solid var(--bronze);
    }

    .dica strong {
      color: var(--foreground);
    }

    .dica code {
      font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      font-size: 0.6875rem;
      background: var(--card);
      padding: 0.0625rem 0.25rem;
      border: 1px solid var(--border);
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly senhaDemo = SENHA_MOCK;
  readonly carregando = signal(false);
  readonly erro = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  invalido(campo: 'email' | 'senha'): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && controle.touched;
  }

  entrar(): void {
    this.erro.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando.set(true);

    this.auth.entrar(this.form.getRawValue()).subscribe({
      next: () => {
        this.carregando.set(false);
        void this.router.navigate(['/']);
      },
      error: (e: Error) => {
        this.carregando.set(false);
        this.erro.set(e.message || 'Não foi possível entrar.');
      },
    });
  }
}
