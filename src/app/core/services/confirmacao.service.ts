import { Injectable, signal } from '@angular/core';

export interface PedidoConfirmacao {
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Troca o botão de confirmar para o estilo "perigo" (ações destrutivas). */
  perigo?: boolean;
}

interface PedidoAtivo extends PedidoConfirmacao {
  resolver: (confirmado: boolean) => void;
}

/**
 * Substitui o `confirm()` nativo do navegador por uma caixa própria, no
 * visual do app. `ConfirmacaoDialogComponent` (montado uma vez em
 * `LayoutComponent`) lê `pedido()` e chama `resolver` com a escolha.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmacaoService {
  private readonly _pedido = signal<PedidoAtivo | null>(null);
  readonly pedido = this._pedido.asReadonly();

  /** Mostra a caixa e resolve `true`/`false` conforme o clique da pessoa. */
  confirmar(pedido: PedidoConfirmacao): Promise<boolean> {
    return new Promise((resolver) => {
      this._pedido.set({ ...pedido, resolver });
    });
  }

  responder(confirmado: boolean): void {
    this._pedido()?.resolver(confirmado);
    this._pedido.set(null);
  }
}
