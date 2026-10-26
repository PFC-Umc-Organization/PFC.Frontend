import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, input, viewChild } from '@angular/core';

import { STATUS_LEGEND, TimelineItem } from '../../../core/models';
import { ScrollHintDirective } from '../../directives/scroll-hint.directive';
import { DeliverableCardComponent } from '../deliverable-card/deliverable-card.component';

/** The activities side by side, in deadline order, scrolled to the first one still open. */
@Component({
  selector: 'app-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DeliverableCardComponent, ScrollHintDirective],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
})
export class TimelineComponent {
  readonly items = input<TimelineItem[]>([]);
  readonly interactive = input(true);
  readonly eyebrow = input('Entregáveis');
  readonly heading = input('Cronograma de entregas');
  readonly description = input('');
  readonly showLegend = input(true);
  /** A secondary section of the page: a smaller heading. */
  readonly compact = input(false);

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
      const item = track
        ?.querySelectorAll<HTMLElement>('.track__item')
        [this.current()]?.querySelector<HTMLElement>('app-deliverable-card');
      if (!track || !item) return;
      // Leaves the edge's fade over the connector, not over the card.
      const fade = 48;
      track.scrollLeft = item.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft - fade;
    });
  }
}
