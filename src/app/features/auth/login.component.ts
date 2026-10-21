import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ErroApi } from '../../core/services/http-erro';
import { CampoSenhaComponent } from '../../shared/components/campo-senha.component';
import { IconeComponent } from '../../shared/components/icone.component';
import { AuthCardComponent } from './auth-card.component';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthCardComponent,
    CampoSenhaComponent,
    IconeComponent,
  ],
  template: `
    <app-auth-card
      titulo="Entrar"
    >
      <form class="form" [formGroup]="form" (ngSubmit)="entrar()">
        @if (erro()) {
          <p class="alerta" role="alert">
            <app-icone nome="alerta" />
            <span>
              {{ erro() }}
              @if (naoConfirmada()) {
                <a
                  routerLink="/confirmar-conta"
                  [queryParams]="{ email: form.controls.email.value }"
                  >Confirmar agora</a
                >
              }
            </span>
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
              placeholder="Seu email UMC"
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
          <app-campo-senha
            campoId="senha"
            [controle]="form.controls.senha"
            [invalido]="invalido('senha')"
            [comIcone]="true"
          />
          @if (invalido('senha')) {
            <span class="field__error">Informe sua senha.</span>
          }
        </div>

        <a
          class="link-button esqueci"
          routerLink="/esqueci-senha"
          [queryParams]="{ email: form.controls.email.value || null }"
          >Esqueci minha senha</a
        >

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
      </form>
    </app-auth-card>
  `,
  styles: `
    .form {
      display: grid;
      gap: 1.25rem;
      margin-top: 1.75rem;
    }

    .esqueci {
      justify-self: center;
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  /** Página que a pessoa tentava abrir antes de cair no login. */
  private readonly retorno = inject(ActivatedRoute).snapshot.queryParamMap.get('retorno');

  readonly carregando = signal(false);
  readonly erro = signal('');
  /** Login recusado porque a conta ainda espera o código do e-mail (403). */
  readonly naoConfirmada = signal(false);

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
      next: (resultado) => {
        this.carregando.set(false);
        if (resultado === 'nova-senha') {
          void this.router.navigate(['/nova-senha']);
          return;
        }
        void this.router.navigateByUrl(this.destino());
      },
      error: (e: ErroApi) => {
        this.carregando.set(false);
        this.naoConfirmada.set(e.status === 403);
        this.erro.set(e.message || 'Não foi possível entrar.');
      },
    });
  }

  /** Só caminhos internos: um `retorno` externo seria um redirecionamento aberto. */
  private destino(): string {
    const r = this.retorno;
    return r && r.startsWith('/') && !r.startsWith('//') ? r : '/';
  }
}
