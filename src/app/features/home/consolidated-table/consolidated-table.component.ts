import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';
import { CELL_LABEL } from '../status-grid/status-grid.component';
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
  readonly selectedProject = input<string | null>(null);
  readonly openProject = output<{ projectId: string; projectName: string; section?: 'penalties' }>();

  protected readonly outcomeLabel = OUTCOME_LABEL;
  protected readonly cellLabel = CELL_LABEL;

  // ---------------------------------------------------------------------------
  // Integrantes
  // ---------------------------------------------------------------------------

  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  // Alternância
  toggleMembers(event: Event, projectId: string): void {
    event.stopPropagation();
    this.expanded.update((set) => {
      const next = new Set(set);
      if (!next.delete(projectId)) {
        next.add(projectId);
      }
      return next;
    });
  }

  // Abertura
  open(row: ConsolidatedRow, section?: 'penalties'): void {
    this.openProject.emit({ projectId: row.projectId, projectName: row.name, section });
  }

  // Penalidades
  openPenalties(event: Event, row: ConsolidatedRow): void {
    event.stopPropagation();
    this.open(row, 'penalties');
  }

  // Segmentos
  protected segments(row: ConsolidatedRow): boolean[] {
    return Array.from({ length: row.limit ?? 3 }, (_, i) => i < (row.active ?? 0));
  }

  // Contagem
  protected count(n: number): string {
    return n === 1 ? '1 integrante' : `${n} integrantes`;
  }
}
