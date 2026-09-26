import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { AuthCardComponent } from './auth-card.component';


/**
 * Depois do cadastro o Cognito manda um código de 6 dígitos por e-mail;
 * sem confirmar, o login é recusado. O e-mail chega pela query string
 * (`/confirmar-conta?email=...`) vindo do cadastro ou do login.
 */
@Component({
  selector: 'app-confirmar-conta',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, IconeComponent],
  template: `
    <app-auth-card
      titulo="Confirmar conta"
      subtitulo="Digite o código de 6 dígitos que enviamos para o seu e-mail."
    >
      @if (confirmada()) {
        <p class="ok ok--solto" role="status">
          <app-icone nome="check" />
          <span>{{ confirmada() }}</span>
        </p>

        <p class="troca mt-4">
          <a routerLink="/entrar">Ir para o login</a>
        </p>
      } @else {
        <form class="form" [formGroup]="form" (ngSubmit)="confirmar()">
          @if (erro()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erro() }}</span>
            </p>
          }
          @if (aviso()) {
            <p class="ok" role="status">
              <app-icone nome="check" />
              <span>{{ aviso() }}</span>
            </p>
          }

          <div class="field">
            <label class="field__label" for="email">E-mail</label>
            <input
              id="email"
              type="email"
              class="control"
              placeholder="seurgm@alunos.umc.br"
              autocomplete="username"
              formControlName="email"
              [class.control--invalid]="invalido('email')"
            />
            @if (invalido('email')) {
              <span class="field__error">Informe o e-mail do cadastro.</span>
            }
          </div>

          <div class="field">
            <label class="field__label" for="codigo">Código</label>
            <input
              id="codigo"
              type="text"
              inputmode="numeric"
              maxlength="6"
              class="control codigo"
              placeholder="000000"
              autocomplete="one-time-code"
              formControlName="codigo"
              [class.control--invalid]="invalido('codigo')"
            />
            <span class="field__hint">
              Não chegou? Confira a caixa de spam ou lixo eletrônico.
            </span>
            @if (invalido('codigo')) {
              <span class="field__error">O código tem 6 dígitos.</span>
            }
          </div>

          <button
            type="submit"
            class="btn btn--primary btn--block"
            [disabled]="carregando()"
          >
            {{ carregando() ? 'Confirmando…' : 'Confirmar conta' }}
          </button>

          <p class="troca acoes">
            <button
              type="button"
              class="link-button"
              [disabled]="reenviando()"
              (click)="reenviar()"
            >
              {{ reenviando() ? 'Enviando…' : 'Reenviar código' }}
            </button>
            ·
            <a routerLink="/entrar">Voltar ao login</a>
          </p>
        </form>
      }
    </app-auth-card>
  `,
  styles: `
    .form {
      display: grid;
      gap: 1.25rem;
      margin-top: 1.75rem;
    }

    .codigo {
      font-size: 1.25rem;
      letter-spacing: 0.4em;
      font-variant-numeric: tabular-nums;
    }

    .alerta,
    .ok {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .alerta {
      color: var(--destructive);
      background: color-mix(in oklch, var(--destructive) 6%, transparent);
      border: 1px solid
        color-mix(in oklch, var(--destructive) 30%, transparent);
    }

    .ok {
      color: var(--success);
      background: color-mix(in oklch, var(--success) 8%, transparent);
      border: 1px solid color-mix(in oklch, var(--success) 30%, transparent);
    }

    .ok--solto {
      margin-top: 1.75rem;
    }

    .troca {
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    .acoes {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
  `,
})
export class ConfirmarContaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly carregando = signal(false);
  readonly reenviando = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly confirmada = signal('');

  readonly form = this.fb.nonNullable.group({
    email: [
      inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '',
      [Validators.required, Validators.email],
    ],
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  invalido(campo: 'email' | 'codigo'): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && controle.touched;
  }

  confirmar(): void {
    this.erro.set('');
    this.aviso.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    const { email, codigo } = this.form.getRawValue();

    this.auth.confirmar(email.trim(), codigo.trim()).subscribe({
      next: (resposta) => {
        this.carregando.set(false);
        this.confirmada.set(resposta.mensagem);
      },
      error: (e: Error) => {
        this.carregando.set(false);
        this.erro.set(e.message || 'Não foi possível confirmar a conta.');
      },
    });
  }

  reenviar(): void {
    this.erro.set('');
    this.aviso.set('');

    const email = this.form.controls.email;
    if (email.invalid) {
      email.markAsTouched();
      return;
    }

    this.reenviando.set(true);
    this.auth.reenviarCodigo(email.value.trim()).subscribe({
      next: (resposta) => {
        this.reenviando.set(false);
        this.aviso.set(resposta.mensagem);
      },
      error: (e: Error) => {
        this.reenviando.set(false);
        this.erro.set(e.message || 'Não foi possível reenviar o código.');
      },
    });
  }
}
