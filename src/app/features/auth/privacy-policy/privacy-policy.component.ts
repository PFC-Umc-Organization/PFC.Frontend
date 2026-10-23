import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/** The LGPD privacy policy and terms of use, as a modal. */
@Component({
  selector: 'app-privacy-policy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
})
export class PrivacyPolicyComponent {
  readonly closed = output();
}
