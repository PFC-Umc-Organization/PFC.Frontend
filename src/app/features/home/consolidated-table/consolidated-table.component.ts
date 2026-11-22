import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';
import { CELL_LABEL } from '../status-grid/status-grid.component';
import { Activity, PROJECT_STATUSES, PROJECT_STATUS_LABEL, ProjectStatus } from '../../../core/models';
import { ConsolidatedRow } from '../staff-home/staff-home.kpis';

// Mudança de status: null volta para a sugestão do sistema
export interface StatusChange {
  projectId: string;
  projectName: string;
  from: ProjectStatus;
  to: ProjectStatus | null;
  note?: string;
}

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
  readonly total = input<number | null>(null);
  readonly loading = input(false);
  readonly heading = input('Entregas por projeto');
  readonly emptyText = input.required<string>();
  readonly selectedProject = input<string | null>(null);
  readonly activities = input<Activity[]>([]);
  readonly activityId = input<string | null>(null);
  readonly editable = input(false);
  readonly openProject = output<{ projectId: string; projectName: string; section?: 'penalties'; activityId?: string }>();
  readonly statusChange = output<StatusChange>();

  protected readonly statuses = PROJECT_STATUSES;
  protected readonly statusLabel = PROJECT_STATUS_LABEL;
  protected readonly cellLabel = CELL_LABEL;

  // ---------------------------------------------------------------------------
  // Integrantes
  // ---------------------------------------------------------------------------

  protected readonly revealed = signal<string | null>(null);
  protected readonly count = computed(() => this.total() ?? this.rows().length);

  // Chave
  protected key(projectId: string, rgm: string): string {
    return `${projectId}|${rgm}`;
  }

  // RGM
  reveal(event: Event, projectId: string, rgm: string): void {
    event.stopPropagation();
    const key = this.key(projectId, rgm);
    this.revealed.set(this.revealed() === key ? null : key);
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

  // Status: o seletor volta ao valor atual até a mudança ser confirmada e recarregada
  chooseStatus(event: Event, row: ConsolidatedRow): void {
    const select = event.target as HTMLSelectElement;
    const to = (select.value || null) as ProjectStatus | null;
    select.value = row.status ?? '';
    if (row.status) {
      this.statusChange.emit({ projectId: row.projectId, projectName: row.name, from: row.status, to, note: row.note });
    }
  }

  // Segmentos
  protected segments(row: ConsolidatedRow): boolean[] {
    return Array.from({ length: row.limit ?? 3 }, (_, i) => i < (row.active ?? 0));
  }
}
