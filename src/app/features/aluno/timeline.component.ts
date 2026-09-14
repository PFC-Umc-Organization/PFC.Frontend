import { Component, Input } from '@angular/core';

import { ItemTimeline, ROTULO_LEGENDA } from '../../core/models';
import { EntregavelCardComponent } from './entregavel-card.component';


@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [EntregavelCardComponent],
  template: `
    <section class="stack">
      <header class="page-header">
        <div>
          @if (sobretitulo) {
            <p class="eyebrow">{{ sobretitulo }}</p>
          }
          <h2 class="page-title mt-2">{{ titulo }}</h2>
          @if (descricao) {
            <p class="lead mt-2">{{ descricao }}</p>
          }
        </div>

        @if (mostrarLegenda) {
          <div class="legend">
            @for (l of legenda; track l.texto) {
              <span class="legend__item">
                <span class="dot" [class]="'dot--' + l.tom" aria-hidden="true"></span>
                {{ l.texto }}
              </span>
            }
          </div>
        }
      </header>

      @if (itens.length === 0) {
        <p class="vazio">
          Nenhuma atividade publicada ainda. Assim que o professor cadastrar a
          primeira entrega, ela aparece aqui.
        </p>
      } @else {
        <div class="trilha">
          <ol class="trilha__lista">
            @for (item of itens; track item.atividadeId; let primeiro = $first) {
              <li class="trilha__item">
                @if (!primeiro) {
                  <span class="conector" aria-hidden="true"></span>
                }
                <app-entregavel-card [dados]="item" [interativo]="interativo" />
              </li>
            }
          </ol>
        </div>
      }
    </section>
  `,
  styles: `
    .trilha {
      overflow-x: auto;
      padding-bottom: 0.75rem;
    }

    .trilha__lista {
      display: flex;
      align-items: stretch;
      min-width: max-content;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .trilha__item {
      display: flex;
      align-items: stretch;
    }

    .conector {
      display: flex;
      align-items: center;
      width: 2.5rem;
      flex-shrink: 0;
    }

    .conector::before {
      content: '';
      width: 100%;
      height: 1px;
      background: color-mix(in oklch, var(--primary) 25%, transparent);
    }

    @media (min-width: 640px) {
      .conector {
        width: 3.5rem;
      }
    }

    .vazio {
      padding: 2.5rem 1.25rem;
      text-align: center;
      color: var(--muted-foreground);
      background: var(--card);
      border: 1px dashed color-mix(in oklch, var(--primary) 20%, transparent);
    }
  `,
})
export class TimelineComponent {
  @Input() itens: ItemTimeline[] = [];
  @Input() interativo = true;
  @Input() sobretitulo = 'Entregáveis';
  @Input() titulo = 'Timeline de Entregas';
  @Input() descricao =
    'Marque cada etapa como concluída antes da data e hora limite.';
  @Input() mostrarLegenda = true;

  readonly legenda = ROTULO_LEGENDA;
}
