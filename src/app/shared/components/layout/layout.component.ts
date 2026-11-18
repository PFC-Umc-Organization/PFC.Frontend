import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { PrivacyPolicyComponent } from '../../../features/auth/privacy-policy/privacy-policy.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { HeaderComponent } from '../header/header.component';

// Componente
@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, ConfirmDialogComponent, PrivacyPolicyComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  readonly policyOpen = signal(false);

  // Inicialização
  constructor() {
    inject(AuthService).refreshUser().pipe(takeUntilDestroyed()).subscribe({ error: () => undefined });
  }
}
