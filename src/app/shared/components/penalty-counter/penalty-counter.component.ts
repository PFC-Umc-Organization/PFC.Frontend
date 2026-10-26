import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ProjectPenalties } from '../../../core/models';

/** One segment per penalty up to the limit; at the limit, "Reprovado". */
@Component({
  selector: 'app-penalty-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './penalty-counter.component.html',
  styleUrl: './penalty-counter.component.scss',
})
export class PenaltyCounterComponent {
  readonly penalties = input.required<ProjectPenalties>();
  readonly compact = input(false);

  protected readonly segments = computed(() => {
    const { ativas, limite } = this.penalties();
    return Array.from({ length: limite }, (_, i) => i < ativas);
  });
  protected readonly text = computed(() => {
    const { ativas, limite } = this.penalties();
    if (this.compact()) {
      return `${ativas} de ${limite}`;
    }
    return ativas === 1 ? '1 penalidade ativa' : `${ativas} penalidades ativas`;
  });
}
