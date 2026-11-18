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

import { AuthService } from '../../../core/services/auth.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { IconComponent, IconName } from '../icon/icon.component';

// Tipo
interface NavItem {
  label: string;
  route: string;
  icon: IconName;
}

// Componente
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);

  readonly menuOpen = signal(false);

  // Inicialização
  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  private readonly studentNav: NavItem[] = [
    { label: 'Início', route: '/', icon: 'dashboard' },
    { label: 'Meu PFC', route: '/meu-pfc', icon: 'landmark' },
    { label: 'Materiais', route: '/materiais', icon: 'book' },
    { label: 'Referências', route: '/referencias', icon: 'search' },
  ];

  private readonly advisorNav: NavItem[] = [
    { label: 'Início', route: '/', icon: 'dashboard' },
    { label: 'Materiais', route: '/materiais', icon: 'book' },
    { label: 'Referências', route: '/referencias', icon: 'search' },
  ];

  private readonly adminNav: NavItem[] = [
    { label: 'Início', route: '/', icon: 'dashboard' },
    { label: 'Turmas', route: '/turmas', icon: 'calendar' },
    { label: 'Usuários', route: '/usuarios', icon: 'users' },
    { label: 'Materiais', route: '/materiais', icon: 'book' },
    { label: 'Referências', route: '/referencias', icon: 'search' },
  ];

  readonly navItems = computed(() => {
    switch (this.auth.role()) {
      case 'ADMIN':
        return this.adminNav;
      case 'ORIENTADOR':
        return this.advisorNav;
      default:
        return this.studentNav;
    }
  });

  // Saída
  async signOut(): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Sair do sistema',
      message: 'Deseja realmente sair do sistema?',
      confirmText: 'Sair',
    });
    if (!confirmed) {
      return;
    }
    this.auth.signOut();
    void this.router.navigate(['/entrar']);
  }
}
