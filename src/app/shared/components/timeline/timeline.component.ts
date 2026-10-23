import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, input, viewChild } from '@angular/core';

import { STATUS_LEGEND, TimelineItem } from '../../../core/models';
import { DeliverableCardComponent } from '../deliverable-card/deliverable-card.component';

/** The activities side by side, in deadline order, scrolled to the first one still open. */
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
  protected readonly sorted = computed(() =>
    [...this.items()].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()),
  );

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly current = computed(() => {
    const items = this.sorted();
    const now = Date.now();
    const open = items.findIndex((i) => new Date(i.deadline).getTime() > now);
    return open === -1 ? items.length - 1 : open;
  });

  constructor() {
    afterRenderEffect(() => {
      const track = this.track()?.nativeElement;
      const item = track?.querySelectorAll<HTMLElement>('.track__item')[this.current()];
      if (!track || !item) return;
      track.scrollLeft = item.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    });
  }
}
