import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';
import { TimelineItem } from '../staff-home/staff-home.grid';

// Componente
@Component({
  selector: 'app-activity-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ScrollHintDirective],
  templateUrl: './activity-timeline.component.html',
  styleUrl: './activity-timeline.component.scss',
})
export class ActivityTimelineComponent {
  readonly items = input.required<TimelineItem[]>();
  readonly selected = input<string | null>(null);
  readonly choose = output<string | null>();
}
