import { Component, Input } from '@angular/core';

export type NomeIcone =
  | 'capelo'
  | 'painel'
  | 'calendario'
  | 'usuarios'
  | 'livro'
  | 'email'
  | 'cadeado'
  | 'sair'
  | 'busca'
  | 'mais'
  | 'check'
  | 'prancheta'
  | 'link-externo'
  | 'lixeira'
  | 'alerta'
  | 'templo'
  | 'editar';

/**
 * Ícones desenhados inline (traçado no estilo Lucide, como no protótipo).
 * Ficam embutidos de propósito: nada de pacote de ícones só para 16 formas,
 * e o bundle final continua leve.
 */
@Component({
  selector: 'app-icone',
  standalone: true,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="espessura"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (nome) {
        @case ('capelo') {
          <path
            d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"
          />
          <path d="M22 10v6" />
          <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
        }
        @case ('painel') {
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        }
        @case ('calendario') {
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 14h.01" />
          <path d="M12 14h.01" />
          <path d="M16 14h.01" />
          <path d="M8 18h.01" />
          <path d="M12 18h.01" />
          <path d="M16 18h.01" />
        }
        @case ('usuarios') {
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        }
        @case ('livro') {
          <path d="M12 7v14" />
          <path
            d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
          />
        }
        @case ('email') {
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        }
        @case ('cadeado') {
          <rect width="18" height="11" x="3" y="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        }
        @case ('sair') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        }
        @case ('busca') {
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        }
        @case ('mais') {
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        }
        @case ('check') {
          <path d="M20 6 9 17l-5-5" />
        }
        @case ('prancheta') {
          <rect width="8" height="4" x="8" y="2" rx="1" />
          <path
            d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
          />
          <path d="M12 11h4" />
          <path d="M12 16h4" />
          <path d="M8 11h.01" />
          <path d="M8 16h.01" />
        }
        @case ('link-externo') {
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path
            d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
          />
        }
        @case ('lixeira') {
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        }
        @case ('alerta') {
          <path
            d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
          />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        }
        @case ('templo') {
          <path d="M3 21h18M5 21V7h14v14M3 7h18M4 3h16M9 7v14M15 7v14" />
        }
        @case ('editar') {
          <path
            d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .622.622l4.353-1.321a2 2 0 0 0 .83-.497z"
          />
          <path d="m15 5 4 4" />
        }
      }
    </svg>
  `,
  styles: `
    /* Tamanho controlável pelo pai via --icone-size, sem briga de cascata. */
    :host {
      display: inline-flex;
      flex-shrink: 0;
      width: var(--icone-size, 1rem);
      height: var(--icone-size, 1rem);
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconeComponent {
  @Input({ required: true }) nome!: NomeIcone;
  @Input() espessura = 2;
}
