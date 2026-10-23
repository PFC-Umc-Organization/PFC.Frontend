import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { STATUS_LEGEND, TimelineItem } from '../../../core/models';
import { DeliverableCardComponent } from '../deliverable-card/deliverable-card.component';

/** The activities side by side, in deadline order. */
@Component({
  selector: 'app-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DeliverableCardComponent],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
})
export class TimelineComponent {
  readonly items = input<TimelineItem[]>([]);
  readonly interactive = input(true);
  readonly eyebrow = input('Entregáveis');
  readonly heading = input('Timeline de Entregas');
  readonly description = input('Marque cada etapa como concluída antes da data e hora limite.');
  readonly showLegend = input(true);

  protected readonly legend = STATUS_LEGEND;
}
