import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs';

import { ehEquipeAcademica } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { IconeComponent, NomeIcone } from './icone.component';

interface ItemNav {
  rotulo: string;
  rota: string;
  icone: NomeIcone;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'menuAberto.set(false)' },
  template: `
    <header class="topbar">
      <div class="shell topbar__inner">
        <a class="marca" routerLink="/">
          <span class="marca__selo">
            <app-icone nome="capelo" class="marca__icone" />
          </span>
          <span class="marca__texto">
            <span class="marca__nome">Athena</span>
            <span class="marca__tagline">O Portal do PFC</span>
          </span>
        </a>

        <button
          type="button"
          class="menu-toggle"
          aria-controls="menu-principal"
          [attr.aria-expanded]="menuAberto()"
          [attr.aria-label]="menuAberto() ? 'Fechar menu' : 'Abrir menu'"
          (click)="menuAberto.set(!menuAberto())"
        >
          <app-icone [nome]="menuAberto() ? 'fechar' : 'menu'" />
        </button>

        <div
          id="menu-principal"
          class="topbar__acoes"
          [class.topbar__acoes--aberto]="menuAberto()"
        >
          <nav class="nav" aria-label="Navegação principal">
            @for (item of itensNav(); track item.rota) {
              <a
                class="nav__item"
                [routerLink]="item.rota"
                routerLinkActive="nav__item--ativo"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: item.rota === '/' }"
              >
                <app-icone [nome]="item.icone" />
                <span>{{ item.rotulo }}</span>
              </a>
            }
          </nav>

          <div class="sessao">
            <span class="sessao__nome">{{ auth.usuario()?.nome }}</span>
            <button
              type="button"
              class="sessao__sair"
              (click)="sair()"
              aria-label="Sair da conta"
            >
              <app-icone nome="sair" />
              <span class="sessao__sair-texto">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: `
    .topbar {
      position: sticky;
      top: 0;
      z-index: 30;
      background: var(--primary);
      color: var(--primary-foreground);
      border-bottom: 1px solid
        color-mix(in oklch, var(--primary-foreground) 20%, transparent);
    }

    .topbar__inner {
      min-height: var(--header-h);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding-block: 0.75rem;
    }

    /* ---------------------------- marca ---------------------------- */
    .marca {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
      color: inherit;
      text-decoration: none;
    }

    .marca__selo {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      flex-shrink: 0;
      background: var(--marble);
      color: var(--primary);
      border: 1px solid
        color-mix(in oklch, var(--primary-foreground) 35%, transparent);
    }

    .marca__icone {
      --icone-size: 1.5rem;
    }

    .marca__texto {
      min-width: 0;
      display: grid;
    }

    .marca__nome {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      line-height: 1.2;
    }

    .marca__tagline {
      font-size: 0.75rem;
      color: color-mix(in oklch, var(--primary-foreground) 70%, transparent);
    }

    /* ---------------------------- ações ---------------------------- */
    /* Abaixo de 1100px a navegação completa não cabe numa linha: vira um
       menu que abre sob o cabeçalho, em vez de quebrar em várias linhas. */
    .menu-toggle {
      display: inline-grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      --icone-size: 1.375rem;
      color: var(--primary-foreground);
      border: 1px solid
        color-mix(in oklch, var(--primary-foreground) 25%, transparent);
    }

    .menu-toggle:hover {
      background: color-mix(in oklch, var(--primary-foreground) 8%, transparent);
    }

    .topbar__acoes {
      display: none;
      flex-basis: 100%;
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
      padding-bottom: 0.5rem;
    }

    .topbar__acoes--aberto {
      display: flex;
    }

    .nav {
      display: grid;
      gap: 0.25rem;
    }

    .nav__item {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      height: 2.75rem;
      padding-inline: 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: color-mix(in oklch, var(--primary-foreground) 80%, transparent);
      text-decoration: none;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;
    }

    .nav__item:hover {
      color: var(--primary-foreground);
      background: color-mix(in oklch, var(--primary-foreground) 8%, transparent);
    }

    .nav__item--ativo {
      color: var(--primary-foreground);
      background: color-mix(
        in oklch,
        var(--primary-foreground) 15%,
        transparent
      );
    }

    /* ---------------------------- sessão ---------------------------- */
    .sessao {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 0.75rem 0;
      border-top: 1px solid
        color-mix(in oklch, var(--primary-foreground) 20%, transparent);
    }

    .sessao__nome {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .sessao__sair {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      min-height: 2.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: color-mix(in oklch, var(--primary-foreground) 80%, transparent);
    }

    .sessao__sair:hover {
      color: var(--primary-foreground);
    }

    @media (min-width: 1100px) {
      .menu-toggle {
        display: none;
      }

      .topbar__acoes,
      .topbar__acoes--aberto {
        display: flex;
        flex-basis: auto;
        flex-direction: row;
        align-items: center;
        gap: 1rem;
        padding-bottom: 0;
      }

      .nav {
        display: flex;
        align-items: center;
      }

      .nav__item {
        height: 2.25rem;
      }

      .sessao {
        padding: 0 0 0 1rem;
        border-top: 0;
        border-left: 1px solid
          color-mix(in oklch, var(--primary-foreground) 20%, transparent);
      }

      .sessao__sair {
        min-height: 0;
      }
    }
  `,
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Menu do celular; fecha ao navegar e com Esc. */
  readonly menuAberto = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuAberto.set(false));
  }

  private readonly navAluno: ItemNav[] = [
    { rotulo: 'Início', rota: '/', icone: 'painel' },
    { rotulo: 'PFC', rota: '/meu-pfc', icone: 'templo' },
    { rotulo: 'Entregáveis', rota: '/materiais', icone: 'prancheta' },
    { rotulo: 'Referências', rota: '/referencias', icone: 'busca' },
  ];

  private readonly navProfessor: ItemNav[] = [
    { rotulo: 'Início', rota: '/', icone: 'painel' },
    { rotulo: 'Gestão de PFC', rota: '/gestao', icone: 'templo' },
    { rotulo: 'Usuários', rota: '/usuarios', icone: 'usuarios' },
    { rotulo: 'Materiais', rota: '/materiais', icone: 'livro' },
    { rotulo: 'Referências', rota: '/referencias', icone: 'busca' },
  ];

  readonly itensNav = computed(() => {
    if (!ehEquipeAcademica(this.auth.perfil())) {
      return this.navAluno;
    }
    return this.auth.perfil() === 'ADMIN'
      ? [...this.navProfessor, { rotulo: 'Turmas', rota: '/turmas', icone: 'calendario' } as ItemNav]
      : this.navProfessor;
  });

  sair(): void {
    this.auth.sair();
    void this.router.navigate(['/entrar']);
  }
}
