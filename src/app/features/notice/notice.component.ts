import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent, IconName } from '../../shared/components/icon/icon.component';

/** "Página não encontrada" and "Área restrita"; the text comes from the route's data. */
@Component({
  selector: 'app-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './notice.component.html',
  styleUrl: './notice.component.scss',
})
export class NoticeComponent {
  readonly icon = input.required<IconName>();
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
}
