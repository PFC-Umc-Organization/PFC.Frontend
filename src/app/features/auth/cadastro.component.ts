import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { AuthCardComponent } from './auth-card.component';


@Component({
  selector: 'app-cadastro',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
            placeholder="seurgm@alunos.umc.br"
            autocomplete="username"
            formControlName="email"
            [class.control--invalid]="invalido('email')"
          />
          <span class="field__hint">
            Use o e-mail institucional com o seu RGM.
          </span>
          @if (invalido('email')) {
            <span class="field__error">
              Use o formato &lt;seu RGM&gt;&#64;alunos.umc.br.
            </span>
          }
        </div>

        <div class="field">
          <label class="field__label" for="senha">Senha</label>
          <div class="senha-wrap">
            <input
              id="senha"
              [type]="mostrarSenha() ? 'text' : 'password'"
              class="control"
              placeholder="Crie uma senha segura"
              autocomplete="new-password"
              formControlName="senha"
              [class.control--invalid]="invalido('senha')"
            />
            <button
              type="button"
              class="senha-wrap__botao"
              [attr.aria-label]="mostrarSenha() ? 'Ocultar senha' : 'Mostrar senha'"
              [attr.aria-pressed]="mostrarSenha()"
              (click)="mostrarSenha.set(!mostrarSenha())"
            >
              <app-icone [nome]="mostrarSenha() ? 'olho-fechado' : 'olho'" />
            </button>
          </div>
          <span class="field__hint">
            Ao menos 8 caracteres, com letra maiúscula, letra minúscula,
            número e símbolo.
          </span>
          @if (invalido('senha')) {
            <span class="field__error">
              A senha não atende aos requisitos acima.
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
    </app-auth-card>
  `,
  styles: `
    .form {
      display: grid;
      gap: 1.25rem;
      margin-top: 1.75rem;
    }
  `,
})
export class CadastroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly carregando = signal(false);
  readonly mostrarSenha = signal(false);
  readonly erro = signal('');

  /**
   * Mesmas regras do Cognito — sem isso o formulário aceitava senhas que o
   * User Pool recusa (política: mín. 8, maiúscula, minúscula, número e
   * símbolo) e e-mails que o Pre Sign-up barra (só <rgm>@alunos.umc.br).
   */
  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: [
      '',
      [Validators.required, Validators.pattern(/^\d+@alunos\.umc\.br$/i)],
    ],
    senha: [
      '',
      [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/),
      ],
    ],
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
      next: () => {
        this.carregando.set(false);
        // O Cognito já mandou o código por e-mail — segue direto pra tela
        // de confirmação com o e-mail preenchido.
        void this.router.navigate(['/confirmar-conta'], {
          queryParams: { email: email.trim().toLowerCase() },
        });
      },
      error: (e: Error) => {
        this.carregando.set(false);
        this.erro.set(e.message || 'Não foi possível criar a conta.');
      },
    });
  }
}
