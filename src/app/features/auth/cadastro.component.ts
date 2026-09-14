import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { AuthCardComponent } from './auth-card.component';


@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthCardComponent,
    IconeComponent,
  ],
  template: `
    <app-auth-card
      titulo="Criar conta"
      subtitulo="Cadastro de aluno — seu RGM precisa já estar pré-autorizado pela coordenação."
    >
      @if (sucesso()) {
        <p class="ok" role="status">
          <app-icone nome="check" />
          <span>{{ sucesso() }}</span>
        </p>

        <p class="troca mt-4">
          <a routerLink="/entrar">Ir para o login</a>
        </p>
      } @else {
        <form class="form" [formGroup]="form" (ngSubmit)="cadastrar()">
          @if (erro()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erro() }}</span>
            </p>
          }

          <div class="field">
            <label class="field__label" for="nome">Nome completo</label>
            <input
              id="nome"
              type="text"
              class="control"
              placeholder="Seu nome"
              autocomplete="name"
              formControlName="nome"
              [class.control--invalid]="invalido('nome')"
            />
            @if (invalido('nome')) {
              <span class="field__error">Informe seu nome completo.</span>
            }
          </div>

          <div class="field">
            <label class="field__label" for="email">E-mail</label>
            <input
              id="email"
              type="email"
              class="control"
              placeholder="rgm@athena.edu"
              autocomplete="username"
              formControlName="email"
              [class.control--invalid]="invalido('email')"
            />
            <span class="field__hint">
              Use o e-mail institucional com o seu RGM.
            </span>
            @if (invalido('email')) {
              <span class="field__error">Informe um e-mail válido.</span>
            }
          </div>

          <div class="field">
            <label class="field__label" for="senha">Senha</label>
            <input
              id="senha"
              type="password"
              class="control"
              placeholder="Crie uma senha segura"
              autocomplete="new-password"
              formControlName="senha"
              [class.control--invalid]="invalido('senha')"
            />
            <span class="field__hint">Use ao menos 8 caracteres.</span>
            @if (invalido('senha')) {
              <span class="field__error">
                A senha precisa de 8 caracteres.
              </span>
            }
          </div>

          <button
            type="submit"
            class="btn btn--primary btn--block"
            [disabled]="carregando()"
          >
            {{ carregando() ? 'Criando conta…' : 'Criar conta' }}
          </button>

          <p class="troca">
            Já tem uma conta?
            <a routerLink="/entrar">Entrar</a>
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

    .ok {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-top: 1.75rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--success);
      background: color-mix(in oklch, var(--success) 8%, transparent);
      border: 1px solid color-mix(in oklch, var(--success) 30%, transparent);
    }

    .troca {
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }
  `,
})
export class CadastroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
  });

  invalido(campo: 'nome' | 'email' | 'senha'): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && controle.touched;
  }

  cadastrar(): void {
    this.erro.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    const { nome, email, senha } = this.form.getRawValue();

    this.auth.cadastrar({ nome, email, senha, perfil: 'ALUNO' }).subscribe({
      next: (resposta) => {
        this.carregando.set(false);
        this.sucesso.set(resposta.mensagem);
      },
      error: (e: Error) => {
        this.carregando.set(false);
        this.erro.set(e.message || 'Não foi possível criar a conta.');
      },
    });
  }
}
