import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ProjectDetail, cohortLabel } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-group-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './group-card.component.html',
  styleUrl: './group-card.component.scss',
})
export class GroupCardComponent {
  readonly detail = input.required<ProjectDetail>();
  protected readonly cohortLabel = cohortLabel;
}
