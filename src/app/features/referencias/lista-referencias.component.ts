import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Referencia } from '../../core/models';
import { IconeComponent } from '../../shared/components/icone.component';
import { PrazoPipe } from '../../shared/pipes/prazo.pipe';

/**
 * Lista de referências do projeto, já em ABNT e em ordem alfabética (ordem
 * da seção "Referências" do trabalho). Usada nas duas visões: o aluno
 * edita, a equipe acadêmica só acompanha.
 */
@Component({
  selector: 'app-lista-referencias',
  standalone: true,
  imports: [IconeComponent, PrazoPipe],
  template: `
    <section class="card card--flush">
      <div class="card__head row--between cabecalho">
        <div class="row">
          <app-icone nome="livro" class="card__head-icone" />
          <h2 class="section-title">
            Referências {{ nomeProjeto ? 'do projeto ' + nomeProjeto : '' }}
            ({{ referencias.length }})
          </h2>
        </div>
        @if (referencias.length > 0) {
          <button type="button" class="btn btn--outline btn--sm" (click)="copiarTodas.emit()">
            {{ copiado === 'todas' ? 'Copiado!' : 'Copiar todas (ABNT)' }}
          </button>
        }
      </div>

      @if (aviso) {
        <p class="lista__aviso" role="alert">{{ aviso }}</p>
      }

      @if (carregando) {
        <p class="lista__vazio">Carregando referências…</p>
      } @else if (erro) {
        <p class="lista__vazio lista__erro">{{ erro }}</p>
      } @else {
        <ol class="lista">
          @for (r of referencias; track r.id) {
            <li class="referencia">
              <p class="referencia__abnt" [innerHTML]="r.abntHtml"></p>
              <div class="referencia__base">
                <span class="text-xs muted">
                  @if (r.adicionadaPor) {
                    adicionada por {{ r.adicionadaPor }} ·
                  }
                  {{ r.adicionadaEm | prazo: true }}
                </span>
                <div class="row">
                  <button type="button" class="btn btn--ghost btn--sm" (click)="copiar.emit(r)">
                    {{ copiado === r.id ? 'Copiado!' : 'Copiar' }}
                  </button>
                  @if (editavel) {
                    <button
                      type="button"
                      class="btn btn--ghost btn--sm referencia__remover"
                      [disabled]="removendoId === r.id"
                      (click)="remover.emit(r)"
                      [attr.aria-label]="'Remover ' + r.titulo"
                    >
                      <app-icone nome="lixeira" class="btn__icon" />
                      Remover
                    </button>
                  }
                </div>
              </div>
            </li>
          } @empty {
            <li class="lista__vazio">
              {{
                editavel
                  ? 'Nenhuma referência ainda. Busque um artigo acima e clique em "Adicionar".'
                  : 'Este grupo ainda não adicionou referências.'
              }}
            </li>
          }
        </ol>
      }
    </section>
  `,
  styles: `
    .cabecalho {
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .card__head-icone {
      --icone-size: 1.125rem;
      color: var(--primary);
    }

    .lista {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .referencia {
      display: grid;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border);
    }

    .referencia:first-child {
      border-top: 0;
    }

    .referencia__abnt {
      font-size: 0.875rem;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .referencia__base {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .referencia__remover:hover {
      color: var(--destructive);
    }

    .lista__vazio {
      padding: 2rem 1.25rem;
      text-align: center;
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }

    .lista__erro {
      color: var(--destructive);
    }

    .lista__aviso {
      padding: 0.75rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--destructive);
      border-bottom: 1px solid var(--border);
    }
  `,
})
export class ListaReferenciasComponent {
  @Input() referencias: Referencia[] = [];
  @Input() nomeProjeto = '';
  @Input() editavel = false;
  @Input() carregando = false;
  @Input() erro = '';
  @Input() aviso = '';
  @Input() removendoId: string | null = null;
  /** Id da referência recém-copiada (ou 'todas') — troca o rótulo do botão. */
  @Input() copiado: string | null = null;

  @Output() readonly copiar = new EventEmitter<Referencia>();
  @Output() readonly copiarTodas = new EventEmitter<void>();
  @Output() readonly remover = new EventEmitter<Referencia>();
}
