import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { STATUS_SHORT_LABEL, STATUS_TONE, SubmissionStatus } from '../../../core/models';

/** A submission status badge, for the staff tables. */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
})
export class StatusBadgeComponent {
  readonly status = input.required<SubmissionStatus>();

  readonly tone = computed(() => STATUS_TONE[this.status()]);
  readonly label = computed(() => STATUS_SHORT_LABEL[this.status()]);
}
