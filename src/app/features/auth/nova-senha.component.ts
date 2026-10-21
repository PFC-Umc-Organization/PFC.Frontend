import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { DICA_SENHA, REGRA_SENHA } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CampoSenhaComponent } from '../../shared/components/campo-senha.component';
import { IconeComponent } from '../../shared/components/icone.component';
import { AuthCardComponent } from './auth-card.component';

export function senhasIguais(grupo: AbstractControl): ValidationErrors | null {
  const { senha, confirmacao } = grupo.value as { senha: string; confirmacao: string };
  return confirmacao && senha !== confirmacao ? { diferentes: true } : null;
}

/**
 * Primeiro acesso de orientador ou admin: a conta criada pela coordenação
 * chega com uma senha temporária por e-mail, e o Cognito exige trocá-la.
 */
@Component({
  selector: 'app-nova-senha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, CampoSenhaComponent, IconeComponent],
  template: `
    <app-auth-card
      titulo="Defina sua senha"
      subtitulo="É o seu primeiro acesso: troque a senha temporária que chegou por e-mail."
    >
      @if (!auth.desafioPendente()) {
        <p class="alerta alerta--solto" role="alert">
          <app-icone nome="alerta" />
          <span>Entre primeiro com a senha temporária do e-mail.</span>
        </p>
        <p class="troca mt-4"><a routerLink="/entrar">Ir para o login</a></p>
      } @else {
        <form class="form" [formGroup]="form" (ngSubmit)="salvar()">
          @if (erro()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erro() }}</span>
            </p>
          }

          <p class="conta">Conta: <strong>{{ auth.emailDoDesafio() }}</strong></p>

          <div class="field">
            <label class="field__label" for="senha">Nova senha</label>
            <app-campo-senha
              campoId="senha"
              [controle]="form.controls.senha"
              autocomplete="new-password"
              descricao="senha-dica"
              [invalido]="invalido('senha')"
            />
            <span class="field__hint" id="senha-dica">{{ dicaSenha }}</span>
            @if (invalido('senha')) {
              <span class="field__error">A senha não atende aos requisitos acima.</span>
            }
          </div>

          <div class="field">
            <label class="field__label" for="confirmacao">Repita a nova senha</label>
            <app-campo-senha
              campoId="confirmacao"
              [controle]="form.controls.confirmacao"
              autocomplete="new-password"
              [invalido]="diferentes()"
            />
            @if (diferentes()) {
              <span class="field__error">As senhas não são iguais.</span>
            }
          </div>

          <button type="submit" class="btn btn--primary btn--block" [disabled]="carregando()">
            {{ carregando() ? 'Salvando…' : 'Salvar e entrar' }}
          </button>
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

    .conta {
      margin: 0;
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    .alerta--solto {
      margin-top: 1.75rem;
    }
  `,
})
export class NovaSenhaComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly dicaSenha = DICA_SENHA;

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      senha: ['', [Validators.required, Validators.pattern(REGRA_SENHA)]],
      confirmacao: ['', Validators.required],
    },
    { validators: senhasIguais },
  );

  invalido(campo: 'senha'): boolean {
    const c = this.form.controls[campo];
    return c.invalid && c.touched;
  }

  diferentes(): boolean {
    return this.form.hasError('diferentes') && this.form.controls.confirmacao.touched;
  }

  salvar(): void {
    this.erro.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.carregando.set(true);
    this.auth.definirNovaSenha(this.form.controls.senha.value).subscribe({
      next: () => {
        this.carregando.set(false);
        void this.router.navigate(['/']);
      },
      error: (e: Error) => {
        this.carregando.set(false);
        this.erro.set(e.message || 'Não foi possível salvar a senha.');
      },
    });
  }
}
