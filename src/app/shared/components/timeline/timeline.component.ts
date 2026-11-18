import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, input, viewChild } from '@angular/core';

import { STATUS_LEGEND, TimelineItem } from '../../../core/models';
import { ScrollHintDirective } from '../../directives/scroll-hint.directive';
import { DeliverableCardComponent } from '../deliverable-card/deliverable-card.component';

// Componente
@Component({
  selector: 'app-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DeliverableCardComponent, ScrollHintDirective],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
})
export class TimelineComponent {
  readonly items = input<TimelineItem[]>([]);
  readonly eyebrow = input('Entregáveis');
  readonly heading = input('Cronograma de entregas');
  readonly description = input('');
  readonly showLegend = input(true);
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

  // Inicialização
  constructor() {
    afterRenderEffect(() => {
      const track = this.track()?.nativeElement;
      const item = track
        ?.querySelectorAll<HTMLElement>('.track__item')
        [this.current()]?.querySelector<HTMLElement>('app-deliverable-card');
      if (!track || !item) return;
      const fade = 48;
      track.scrollLeft = item.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft - fade;
    });
  }
}
