import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PrivacyPolicyComponent } from '../privacy-policy/privacy-policy.component';

/** The frame of the signed-out screens. */
@Component({
  selector: 'app-auth-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, PrivacyPolicyComponent],
  templateUrl: './auth-card.component.html',
  styleUrl: './auth-card.component.scss',
})
export class AuthCardComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input('');

  readonly policyOpen = signal(false);

  openPolicy(event: Event): void {
    event.preventDefault();
    this.policyOpen.set(true);
  }
}
