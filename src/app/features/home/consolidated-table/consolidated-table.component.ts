import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';
import { ConsolidatedRow, OUTCOME_LABEL } from '../staff-home/staff-home.kpis';

// Componente
@Component({
  selector: 'app-consolidated-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrollHintDirective],
  templateUrl: './consolidated-table.component.html',
  styleUrl: './consolidated-table.component.scss',
})
export class ConsolidatedTableComponent {
  readonly rows = input.required<ConsolidatedRow[]>();
  readonly loading = input(false);
  readonly heading = input('Entregas por projeto');
  readonly emptyText = input.required<string>();
  readonly openable = input(false);
  readonly selectedProject = input<string | null>(null);
  readonly openProject = output<{ projectId: string; projectName: string }>();

  protected readonly outcomeLabel = OUTCOME_LABEL;
}
