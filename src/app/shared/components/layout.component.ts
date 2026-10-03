import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ConfirmacaoDialogComponent } from './confirmacao-dialog.component';
import { HeaderComponent } from './header.component';

/** Casca das telas internas: header fixo + conteúdo roteado. */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, ConfirmacaoDialogComponent],
  template: `
    <app-header />
    <div class="shell">
      <router-outlet />
    </div>
    <app-confirmacao-dialog />
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
