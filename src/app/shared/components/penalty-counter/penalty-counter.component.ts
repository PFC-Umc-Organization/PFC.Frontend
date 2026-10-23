import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ProjectPenalties } from '../../../core/models';

/** "N de 3" with one mark per possible penalty, or REPROVADO at the limit. */
@Component({
  selector: 'app-penalty-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './penalty-counter.component.html',
  styleUrl: './penalty-counter.component.scss',
})
export class PenaltyCounterComponent {
  readonly penalties = input.required<ProjectPenalties>();
  readonly compact = input(false);

  protected readonly marks = computed(() => {
    const { ativas, limite } = this.penalties();
    return Array.from({ length: limite }, (_, i) => i < ativas);
  });
  protected readonly text = computed(() => {
    const { ativas, limite, reprovado } = this.penalties();
    if (reprovado) {
      return 'Reprovado';
    }
    return this.compact() ? `${ativas}/${limite}` : `${ativas} de ${limite} penalidade${limite === 1 ? '' : 's'}`;
  });
}
