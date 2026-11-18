import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';
import { CELL_LABEL } from '../status-grid/status-grid.component';
import { Activity } from '../../../core/models';
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
  readonly activities = input<Activity[]>([]);
  readonly activityId = input<string | null>(null);
  readonly openProject = output<{ projectId: string; projectName: string; section?: 'penalties'; activityId?: string }>();

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
  open(row: ConsolidatedRow, section?: 'penalties', activityId?: string): void {
    this.openProject.emit({ projectId: row.projectId, projectName: row.name, section, activityId: activityId ?? this.activityId() ?? undefined });
  }

  // Segmento
  openSegment(event: Event, row: ConsolidatedRow, activityId: string): void {
    event.stopPropagation();
    this.open(row, undefined, activityId);
  }

  // Dica
  protected tip(activityId: string, state: keyof typeof CELL_LABEL): string {
    const a = this.activities().find((x) => x.id === activityId);
    const date = a ? new Date(a.prazo).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
    return `${date} · ${a?.titulo ?? ''} · ${CELL_LABEL[state]}`;
  }

  // Situação
  protected stateOf(row: ConsolidatedRow, activityId: string): keyof typeof CELL_LABEL | null {
    return row.cells.find((c) => c.activityId === activityId)?.state ?? null;
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
