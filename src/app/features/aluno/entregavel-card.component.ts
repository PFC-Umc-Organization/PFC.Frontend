import { Component, Input, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  ItemTimeline,
  ROTULO_STATUS_ENTREGA,
  TOM_STATUS_ENTREGA,
} from '../../core/models';
import { IconeComponent } from '../../shared/components/icone.component';
import { PrazoPipe } from '../../shared/pipes/prazo.pipe';

/** Um quadrado da timeline de entregas. */
@Component({
  selector: 'app-entregavel-card',
  standalone: true,
  imports: [IconeComponent, PrazoPipe, RouterLink],
  template: `
    <article class="card-entregavel" [class]="'tom-' + tom()">
      <div class="topo">
        <div class="row">
          <span class="dot" [class]="'dot--' + tom()" aria-hidden="true"></span>
          <span class="status">{{ rotulo() }}</span>
        </div>
        <h3 class="titulo">{{ item().titulo }}</h3>
        <p class="projeto">{{ item().projetoNome }}</p>
      </div>

      <div class="base">
        <p class="prazo">
          <app-icone nome="calendario" class="prazo__icone" />
          Entrega até: {{ item().prazo | prazo }}
        </p>

        @if (concluido()) {
          <p class="acao acao--feito">
            <app-icone nome="check" />
            @if (item().arquivoNome; as nome) {
              Entregue — {{ nome }}
            } @else {
              Entregável concluído
            }
          </p>
        } @else if (!interativo) {
          <p class="acao acao--aguardando">Aguardando entregas</p>
        } @else if (atrasado()) {
          <p class="acao acao--atrasado">
            <app-icone nome="alerta" />
            Prazo encerrado
          </p>
        } @else {
          <a
            class="btn btn--full-xs btn--primary"
            routerLink="/materiais"
            [queryParams]="{ atividade: item().atividadeId }"
          >
            Enviar entrega
          </a>
        }
      </div>
    </article>
  `,
  styles: `
    .card-entregavel {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 15rem;
      aspect-ratio: 1;
      flex-shrink: 0;
      padding: 1.25rem;
      background: var(--card);
      border: 1px solid var(--border);
      transition: border-color 0.15s ease;
    }

    .tom-success {
      border-color: color-mix(in oklch, var(--success) 40%, transparent);
    }

    .tom-primary {
      border-color: color-mix(in oklch, var(--primary) 20%, transparent);
    }

    .tom-destructive {
      border-color: color-mix(in oklch, var(--destructive) 45%, transparent);
    }

    /* ----------------------------- topo ----------------------------- */
    .status {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .tom-success .status {
      color: var(--success);
    }

    .tom-primary .status {
      color: var(--primary);
    }

    .tom-destructive .status {
      color: var(--destructive);
    }

    .titulo {
      margin-top: 0.75rem;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .projeto {
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    /* ----------------------------- base ----------------------------- */
    .base {
      display: grid;
      gap: 0.75rem;
    }

    .prazo {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--foreground);
    }

    .prazo__icone {
      color: var(--primary);
    }

    .acao {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid transparent;
    }

    .acao--feito {
      color: var(--success);
      background: color-mix(in oklch, var(--success) 10%, transparent);
      border-color: color-mix(in oklch, var(--success) 40%, transparent);
    }

    .acao--aguardando {
      color: var(--muted-foreground);
      background: var(--muted);
      border-color: var(--border);
    }

    .acao--atrasado {
      color: var(--destructive);
      background: color-mix(in oklch, var(--destructive) 10%, transparent);
      border-color: color-mix(in oklch, var(--destructive) 40%, transparent);
    }
  `,
})
export class EntregavelCardComponent {
  private readonly _item = signal<ItemTimeline | null>(null);

  @Input({ required: true })
  set dados(valor: ItemTimeline) {
    this._item.set(valor);
  }

  /** Quando falso, o card é somente leitura (visão do professor). */
  @Input() interativo = true;

  readonly item = computed(
    () =>
      this._item() ?? {
        atividadeId: '',
        titulo: '',
        projetoNome: '',
        prazo: '',
        status: 'PENDENTE' as const,
      },
  );

  readonly tom = computed(() => TOM_STATUS_ENTREGA[this.item().status]);
  readonly rotulo = computed(() => ROTULO_STATUS_ENTREGA[this.item().status]);
  readonly concluido = computed(
    () =>
      this.item().status === 'ENTREGUE' ||
      this.item().status === 'ENTREGUE_COM_ATRASO',
  );
  readonly atrasado = computed(() => this.item().status === 'ATRASADO');
}
