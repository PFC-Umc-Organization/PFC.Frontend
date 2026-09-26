import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

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

        <div class="topbar__acoes">
          <nav class="nav" aria-label="Navegação principal">
            @for (item of itensNav(); track item.rota) {
              <a
                class="nav__item"
                [routerLink]="item.rota"
                routerLinkActive="nav__item--ativo"
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
    .topbar__acoes {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .nav {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-wrap: wrap;
    }

    .nav__item {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      height: 2.25rem;
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
      gap: 0.75rem;
      padding-left: 1rem;
      border-left: 1px solid
        color-mix(in oklch, var(--primary-foreground) 20%, transparent);
    }

    .sessao__nome {
      font-size: 0.875rem;
      font-weight: 600;
      display: none;
    }

    @media (min-width: 900px) {
      .sessao__nome {
        display: block;
      }
    }

    .sessao__sair {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: color-mix(in oklch, var(--primary-foreground) 80%, transparent);
    }

    .sessao__sair:hover {
      color: var(--primary-foreground);
    }

    .sessao__sair-texto {
      display: none;
    }

    @media (min-width: 640px) {
      .sessao__sair-texto {
        display: inline;
      }
    }
  `,
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly navAluno: ItemNav[] = [
    { rotulo: 'Início', rota: '/', icone: 'painel' },
    { rotulo: 'PFC', rota: '/meu-pfc', icone: 'templo' },
    { rotulo: 'Entregáveis', rota: '/materiais', icone: 'prancheta' },
    { rotulo: 'Referências', rota: '/referencias', icone: 'busca' },
  ];

  private readonly navProfessor: ItemNav[] = [
    { rotulo: 'Início', rota: '/', icone: 'painel' },
    { rotulo: 'Gestão de PFC', rota: '/gestao', icone: 'templo' },
    { rotulo: 'Atividades', rota: '/atividades', icone: 'prancheta' },
    { rotulo: 'Usuários', rota: '/usuarios', icone: 'usuarios' },
    { rotulo: 'Materiais', rota: '/materiais', icone: 'livro' },
    { rotulo: 'Referências', rota: '/referencias', icone: 'busca' },
  ];

  readonly itensNav = computed(() =>
    ehEquipeAcademica(this.auth.perfil()) ? this.navProfessor : this.navAluno,
  );

  sair(): void {
    this.auth.sair();
    void this.router.navigate(['/entrar']);
  }
}
