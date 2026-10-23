import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type IconName =
  | 'graduation-cap'
  | 'dashboard'
  | 'calendar'
  | 'users'
  | 'book'
  | 'email'
  | 'lock'
  | 'logout'
  | 'search'
  | 'plus'
  | 'check'
  | 'clipboard'
  | 'external-link'
  | 'trash'
  | 'alert'
  | 'landmark'
  | 'edit'
  | 'menu'
  | 'close'
  | 'eye'
  | 'eye-off'
  | 'download';

/** Inline Lucide-style icons: a package for a couple dozen shapes would weigh more. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() strokeWidth = 2;
}
