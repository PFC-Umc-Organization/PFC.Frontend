import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent } from './header.component';

/** Casca das telas internas: header fixo + conteúdo roteado. */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <app-header />
    <div class="shell">
      <router-outlet />
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: var(--background);
    }
  `,
})
export class LayoutComponent {}
