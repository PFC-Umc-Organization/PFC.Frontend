import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { STATUS_SHORT_LABEL, SubmissionStatus } from '../../../core/models';

/** A submission status as a dot and a label, for the staff panel's grid. */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  readonly status = input.required<SubmissionStatus>();

  readonly label = computed(() => STATUS_SHORT_LABEL[this.status()]);
}
