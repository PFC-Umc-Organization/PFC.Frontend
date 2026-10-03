import { Component, inject } from '@angular/core';

import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { IconeComponent } from './icone.component';

/**
 * Caixa de confirmação do próprio app — substitui o `confirm()` nativo do
 * navegador. Montada uma vez em `LayoutComponent`; qualquer tela pede a
 * confirmação via `ConfirmacaoService.confirmar(...)`.
 */
@Component({
  selector: 'app-confirmacao-dialog',
  standalone: true,
  imports: [IconeComponent],
  template: `
    @if (servico.pedido(); as pedido) {
      <div class="fundo" (click)="cancelar()">
        <div
          class="caixa"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-labelledby]="'confirmacao-titulo'"
          (click)="$event.stopPropagation()"
        >
          <div class="caixa__cabeca" [class.caixa__cabeca--perigo]="pedido.perigo">
            <app-icone nome="alerta" />
            <h2 id="confirmacao-titulo" class="caixa__titulo">{{ pedido.titulo }}</h2>
          </div>

          <p class="caixa__mensagem">{{ pedido.mensagem }}</p>

          <div class="caixa__acoes">
            <button type="button" class="btn btn--outline btn--sm" (click)="cancelar()">
              {{ pedido.textoCancelar ?? 'Cancelar' }}
            </button>
            <button
              type="button"
              class="btn btn--sm"
              [class.btn--destrutivo]="pedido.perigo"
              [class.btn--primary]="!pedido.perigo"
              (click)="confirmar()"
            >
              {{ pedido.textoConfirmar ?? 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .fundo {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: color-mix(in oklch, black 45%, transparent);
      z-index: 1000;
    }

    .caixa {
      width: 100%;
      max-width: 26rem;
      padding: 1.5rem;
      background: var(--card);
      border: 1px solid color-mix(in oklch, var(--primary) 15%, transparent);
      box-shadow: 0 1.5rem 3rem -1rem rgba(0, 0, 0, 0.35);
    }

    .caixa__cabeca {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      color: var(--primary);
    }

    .caixa__cabeca--perigo {
      color: var(--destructive);
    }

    .caixa__titulo {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--foreground);
    }

    .caixa__mensagem {
      margin-top: 0.75rem;
      font-size: 0.9rem;
      color: var(--muted-foreground);
    }

    .caixa__acoes {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }

    .btn--destrutivo {
      color: white;
      background: var(--destructive);
      border-color: var(--destructive);
    }

    .btn--destrutivo:hover {
      background: color-mix(in oklch, var(--destructive) 85%, black);
    }
  `,
})
export class ConfirmacaoDialogComponent {
  protected readonly servico = inject(ConfirmacaoService);

  confirmar(): void {
    this.servico.responder(true);
  }

  cancelar(): void {
    this.servico.responder(false);
  }
}
