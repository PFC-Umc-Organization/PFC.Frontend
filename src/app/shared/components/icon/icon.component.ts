import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

// Tipo
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

// Componente
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
