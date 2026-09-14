import { Component, Input } from '@angular/core';

import { IconeComponent } from '../../shared/components/icone.component';


@Component({
  selector: 'app-auth-card',
  standalone: true,
  imports: [IconeComponent],
  template: `
    <main class="tela">
      <section class="cartao">
        <div class="cartao__marca">
          <span class="cartao__selo">
            <app-icone nome="capelo" class="cartao__icone" />
          </span>
          <span class="cartao__nome">Athena</span>
        </div>

        <h1 class="cartao__titulo">{{ titulo }}</h1>
        @if (subtitulo) {
          <p class="cartao__subtitulo">{{ subtitulo }}</p>
        }

        <ng-content />
      </section>

      <footer class="rodape">
        <span>Athena — O Portal do PFC</span>
        <span class="rodape__sep" aria-hidden="true">·</span>
        <span>Projeto Final de Curso</span>
      </footer>
    </main>
  `,
  styles: `
    .tela {
      min-height: 100vh;
      background: var(--background);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      padding: 1.5rem 1rem;
    }

    .cartao {
      width: 100%;
      max-width: 27.5rem;
      background: var(--card);
      border: 1px solid var(--border);
      box-shadow: 0 2px 6px oklch(22% 0.04 260 / 0.08);
      padding: 2.75rem 2.5rem;
    }

    @media (max-width: 480px) {
      .cartao {
        padding: 2rem 1.5rem;
        border: none;
        box-shadow: none;
      }
    }

    /* ---------------------------- marca ---------------------------- */
    .cartao__marca {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 2rem;
    }

    .cartao__selo {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      background: var(--primary);
      color: var(--primary-foreground);
    }

    .cartao__icone {
      --icone-size: 1.125rem;
    }

    .cartao__nome {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: var(--primary);
    }

    /* --------------------------- títulos --------------------------- */
    .cartao__titulo {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--foreground);
      font-family: var(--font-sans);
      letter-spacing: -0.01em;
    }

    .cartao__subtitulo {
      margin-top: 0.5rem;
      font-size: 0.9375rem;
      color: var(--muted-foreground);
    }

    /* --------------------------- rodapé --------------------------- */
    .rodape {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .rodape__sep {
      opacity: 0.6;
    }
  `,
})
export class AuthCardComponent {
  @Input({ required: true }) titulo!: string;
  @Input() subtitulo = '';
}
