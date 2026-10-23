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
import { IconComponent, IconName } from '../icon/icon.component';

interface NavItem {
  label: string;
  route: string;
  icon: IconName;
}

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

  /** The phone menu; closes on navigation and on Esc. */
  readonly menuOpen = signal(false);

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
    { label: 'PFC', route: '/meu-pfc', icon: 'landmark' },
    { label: 'Entregáveis', route: '/entregaveis', icon: 'clipboard' },
    { label: 'Materiais', route: '/materiais', icon: 'book' },
    { label: 'Referências', route: '/referencias', icon: 'search' },
  ];

  private readonly advisorNav: NavItem[] = [
    { label: 'Início', route: '/', icon: 'dashboard' },
    { label: 'Gestão de PFC', route: '/gestao', icon: 'landmark' },
    { label: 'Materiais', route: '/materiais', icon: 'book' },
    { label: 'Referências', route: '/referencias', icon: 'search' },
  ];

  /** Only the coordination manages users and cohorts. */
  private readonly adminNav: NavItem[] = [
    { label: 'Início', route: '/', icon: 'dashboard' },
    { label: 'Gestão de PFC', route: '/gestao', icon: 'landmark' },
    { label: 'Usuários', route: '/usuarios', icon: 'users' },
    { label: 'Materiais', route: '/materiais', icon: 'book' },
    { label: 'Referências', route: '/referencias', icon: 'search' },
    { label: 'Turmas', route: '/turmas', icon: 'calendar' },
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

  signOut(): void {
    this.auth.signOut();
    void this.router.navigate(['/entrar']);
  }
}
