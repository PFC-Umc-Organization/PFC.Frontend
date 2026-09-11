import { Component } from '@angular/core';

/**
 * Friso grego (greek key / meandro) — a faixa ornamental que fecha o hero.
 * Desenhado como `<pattern>` para repetir sem costura em qualquer largura.
 */
@Component({
  selector: 'app-friso',
  standalone: true,
  template: `
    <svg viewBox="0 0 160 24" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern
          id="friso-grego"
          width="32"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 12h8V4h16v16H8v-8h24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#friso-grego)" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
      height: 1.5rem;
      border-top: 1px solid color-mix(in oklch, var(--primary) 20%, transparent);
      background: color-mix(in oklch, var(--primary) 6%, transparent);
      color: var(--primary);
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class FrisoComponent {}
