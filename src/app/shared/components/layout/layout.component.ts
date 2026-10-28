import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { PrivacyPolicyComponent } from '../../../features/auth/privacy-policy/privacy-policy.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { HeaderComponent } from '../header/header.component';

/** The shell of the signed-in screens. Reads the user again: the saved session may have an old cohort. */
@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, ConfirmDialogComponent, PrivacyPolicyComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  /** The policy is also reachable after signing in, from the footer. */
  readonly policyOpen = signal(false);

  constructor() {
    inject(AuthService).refreshUser().subscribe({ error: () => undefined });
  }
}
