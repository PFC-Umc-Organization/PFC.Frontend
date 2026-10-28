import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { STATUS_LABEL, STATUS_TONE, TimelineItem, validationLabel } from '../../../core/models';
import { DeadlinePipe } from '../../pipes/deadline.pipe';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-deliverable-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, DeadlinePipe, RouterLink],
  templateUrl: './deliverable-card.component.html',
  styleUrl: './deliverable-card.component.scss',
})
export class DeliverableCardComponent {
  readonly item = input.required<TimelineItem>();
  /** false: the student has no group yet, so there is nothing to submit. */
  readonly interactive = input(true);

  readonly tone = computed(() => STATUS_TONE[this.item().status]);
  readonly label = computed(() => STATUS_LABEL[this.item().status]);
  readonly done = computed(() => this.item().status === 'ENTREGUE' || this.item().status === 'ENTREGUE_COM_ATRASO');
  readonly late = computed(() => this.item().status === 'ATRASADO');
  readonly validation = computed(() => validationLabel(this.item().validation));
}
