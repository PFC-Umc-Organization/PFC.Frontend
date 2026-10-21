import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { DICA_SENHA, REGRA_SENHA } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CampoSenhaComponent } from '../../shared/components/campo-senha.component';
import { IconeComponent } from '../../shared/components/icone.component';
import { AuthCardComponent } from './auth-card.component';
import { senhasIguais } from './nova-senha.component';

/** Redefinição de senha em dois passos: pedir o código e usá-lo. */
@Component({
  selector: 'app-esqueci-senha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, CampoSenhaComponent, IconeComponent],
  template: `
    <app-auth-card titulo="Redefinir senha" [subtitulo]="subtitulo()">
      @if (concluida()) {
        <p class="ok ok--solto" role="status">
          <app-icone nome="check" />
          <span>{{ concluida() }}</span>
        </p>
        <p class="troca mt-4"><a routerLink="/entrar">Ir para o login</a></p>
      } @else {
        <div class="form">
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

          @if (!codigoEnviado()) {
            <form class="form form--interno" [formGroup]="pedido" (ngSubmit)="enviarCodigo()">
              <div class="field">
                <label class="field__label" for="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  class="control"
                  placeholder="Seu email UMC"
                  autocomplete="username"
                  formControlName="email"
                  [class.control--invalid]="pedido.controls.email.invalid && pedido.controls.email.touched"
                />
                @if (pedido.controls.email.invalid && pedido.controls.email.touched) {
                  <span class="field__error">Informe um e-mail válido.</span>
                }
              </div>
              <button type="submit" class="btn btn--primary btn--block" [disabled]="carregando()">
                {{ carregando() ? 'Enviando…' : 'Enviar código' }}
              </button>
            </form>
          } @else {
            <form class="form form--interno" [formGroup]="troca" (ngSubmit)="redefinir()">
              <p class="conta">Código enviado para <strong>{{ pedido.controls.email.value }}</strong></p>

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
                  [class.control--invalid]="troca.controls.codigo.invalid && troca.controls.codigo.touched"
                />
                <span class="field__hint">Não chegou? Confira a caixa de spam ou lixo eletrônico.</span>
              </div>

              <div class="field">
                <label class="field__label" for="senha">Nova senha</label>
                <app-campo-senha
                  campoId="senha"
                  [controle]="troca.controls.senha"
                  autocomplete="new-password"
                  descricao="senha-dica"
                  [invalido]="troca.controls.senha.invalid && troca.controls.senha.touched"
                />
                <span class="field__hint" id="senha-dica">{{ dicaSenha }}</span>
              </div>

              <div class="field">
                <label class="field__label" for="confirmacao">Repita a nova senha</label>
                <app-campo-senha
                  campoId="confirmacao"
                  [controle]="troca.controls.confirmacao"
                  autocomplete="new-password"
                  [invalido]="diferentes()"
                />
                @if (diferentes()) {
                  <span class="field__error">As senhas não são iguais.</span>
                }
              </div>

              <button type="submit" class="btn btn--primary btn--block" [disabled]="carregando()">
                {{ carregando() ? 'Salvando…' : 'Salvar nova senha' }}
              </button>

              <p class="troca acoes">
                <button type="button" class="link-button" [disabled]="carregando()" (click)="enviarCodigo()">
                  Reenviar código
                </button>
                ·
                <button type="button" class="link-button" (click)="trocarEmail()">Usar outro e-mail</button>
              </p>
            </form>
          }

          <p class="troca"><a routerLink="/entrar">Voltar ao login</a></p>
        </div>
      }
    </app-auth-card>
  `,
  styles: `
    .form {
      display: grid;
      gap: 1.25rem;
      margin-top: 1.75rem;
    }

    .form--interno {
      margin-top: 0;
    }

    .conta {
      margin: 0;
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    .codigo {
      font-size: 1.25rem;
      letter-spacing: 0.4em;
      font-variant-numeric: tabular-nums;
    }

    .ok--solto {
      margin-top: 1.75rem;
    }

    .acoes {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
  `,
})
export class EsqueciSenhaComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly codigoEnviado = signal(false);
  readonly concluida = signal('');
  readonly dicaSenha = DICA_SENHA;

  readonly pedido = this.fb.group({
    email: [
      inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '',
      [Validators.required, Validators.email],
    ],
  });

  readonly troca = this.fb.group(
    {
      codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      senha: ['', [Validators.required, Validators.pattern(REGRA_SENHA)]],
      confirmacao: ['', Validators.required],
    },
    { validators: senhasIguais },
  );

  subtitulo(): string {
    return this.codigoEnviado()
      ? 'Digite o código que enviamos e escolha a nova senha.'
      : 'Informe o e-mail da sua conta: enviamos um código para criar uma senha nova.';
  }

  diferentes(): boolean {
    return this.troca.hasError('diferentes') && this.troca.controls.confirmacao.touched;
  }

  enviarCodigo(): void {
    this.erro.set('');
    this.aviso.set('');
    if (this.pedido.invalid) {
      this.pedido.markAllAsTouched();
      return;
    }
    this.carregando.set(true);
    this.auth.esqueciSenha(this.pedido.controls.email.value.trim()).subscribe({
      next: (r) => {
        this.carregando.set(false);
        this.aviso.set(r.mensagem);
        this.codigoEnviado.set(true);
      },
      error: (e: Error) => {
        this.carregando.set(false);
        this.erro.set(e.message || 'Não foi possível enviar o código.');
      },
    });
  }

  redefinir(): void {
    this.erro.set('');
    this.aviso.set('');
    if (this.troca.invalid) {
      this.troca.markAllAsTouched();
      return;
    }
    const { codigo, senha } = this.troca.getRawValue();
    this.carregando.set(true);
    this.auth.redefinirSenha(this.pedido.controls.email.value.trim(), codigo.trim(), senha).subscribe({
      next: (r) => {
        this.carregando.set(false);
        this.concluida.set(r.mensagem);
      },
      error: (e: Error) => {
        this.carregando.set(false);
        this.erro.set(e.message || 'Não foi possível redefinir a senha.');
      },
    });
  }

  trocarEmail(): void {
    this.codigoEnviado.set(false);
    this.aviso.set('');
    this.erro.set('');
    this.troca.reset();
  }
}
