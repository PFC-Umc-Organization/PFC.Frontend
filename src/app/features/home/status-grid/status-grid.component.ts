import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import {
  ProjectPenalties,
  ProjectStatusRow,
  STATUS_SHORT_LABEL,
  SubmissionStatus,
  ValidationStatus,
} from '../../../core/models';
import { CellState, cellStates } from '../../../core/services/submission-status';
import { StatusGrid } from '../../../core/services/submission.service';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { PenaltyCounterComponent } from '../../../shared/components/penalty-counter/penalty-counter.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

// Visões
export interface CellRef {
  projectId: string;
  projectName: string;
  activityId: string;
}

interface CellView {
  activityId: string;
  status: SubmissionStatus;
  validation?: ValidationStatus;
  state: CellState;
  blockedBy?: string;
}

interface RowView {
  project: ProjectStatusRow['project'];
  cells: CellView[];
}

// Rótulos
export const CELL_LABEL: Record<CellState, string> = {
  done: 'Concluído',
  'done-late': 'Concluído',
  late: 'Atrasado',
  waiting: 'Aguardando',
  blocked: 'Bloqueado',
};

const CELL_ICON: Record<CellState, IconName> = {
  done: 'check',
  'done-late': 'check',
  late: 'alert',
  waiting: 'calendar',
  blocked: 'lock',
};

const DENSE_FROM = 11;

// Legenda
export const LEGEND: { state: CellState; text: string }[] = [
  { state: 'done', text: 'Concluído no prazo' },
  { state: 'done-late', text: 'Concluído com atraso' },
  { state: 'late', text: 'Atrasado, sem entrega' },
  { state: 'waiting', text: 'Aguardando entrega' },
  { state: 'blocked', text: 'Bloqueado: só abre depois da entrega anterior' },
];

// Componente
@Component({
  selector: 'app-status-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, PenaltyCounterComponent, ScrollHintDirective],
  templateUrl: './status-grid.component.html',
  styleUrl: './status-grid.component.scss',
})
export class StatusGridComponent {
  readonly grid = input.required<StatusGrid>();
  readonly loading = input(false);
  readonly heading = input('Entregas por projeto');
  readonly showCount = input(true);
  readonly interactive = input(true);
  readonly footerHint = input('Passe o mouse sobre uma data para ver o nome do entregável. Clique para ver o que cada grupo entregou.');
  readonly error = input('');
  readonly selected = input<CellRef | null>(null);
  readonly emptyText = input.required<string>();
  readonly open = output<CellRef>();
  readonly selectedActivity = input<string | null>(null);
  readonly openActivity = output<string>();
  readonly projectsOpenable = input(false);
  readonly selectedProject = input<string | null>(null);
  readonly openProject = output<{ projectId: string; projectName: string }>();
  readonly penalties = input<Map<string, ProjectPenalties> | undefined>(new Map());
  readonly selectedPenalties = input<string | null>(null);
  readonly openPenalties = output<{ projectId: string; projectName: string }>();

  protected readonly legend = LEGEND;

  protected readonly hovered = signal<string | null>(null);
  protected readonly hoveredActivity = computed(() => this.grid().activities.find((a) => a.id === this.hovered()));

  protected readonly dense = computed(() => this.grid().activities.length >= DENSE_FROM);

  protected readonly rows = computed<RowView[]>(() => {
    const titles = this.grid().activities.map((a) => a.titulo);
    return this.grid().rows.map((row) => {
      const states = cellStates(row.cells.map((c) => c.status));
      return {
        project: row.project,
        cells: row.cells.map<CellView>((c, i) => ({
          ...c,
          state: states[i].state,
          blockedBy: states[i].blockedBy === undefined ? undefined : titles[states[i].blockedBy],
        })),
      };
    });
  });

  private readonly titles = computed(() => new Map(this.grid().activities.map((a) => [a.id, a.titulo])));

  // Título
  titleOf(activityId: string): string {
    return this.titles().get(activityId) ?? '';
  }

  // Rótulo
  label(status: SubmissionStatus): string {
    return STATUS_SHORT_LABEL[status];
  }

  // Texto
  text(state: CellState): string {
    return CELL_LABEL[state];
  }

  // Ícone
  icon(state: CellState): IconName {
    return CELL_ICON[state];
  }

  // Dica
  hint(c: CellView): string {
    switch (c.state) {
      case 'done-late':
        return 'Concluído com atraso';
      case 'late':
        return 'Atrasado: o prazo passou e não há entrega';
      case 'waiting':
        return 'Aguardando a entrega do grupo';
      case 'blocked':
        return c.blockedBy ? `Bloqueado: o grupo precisa entregar antes "${c.blockedBy}"` : 'Bloqueado: há entrega anterior em aberto';
      default:
        return 'Concluído no prazo';
    }
  }

  // Texto
  validationText(v: ValidationStatus | undefined): string {
    if (!v) {
      return '';
    }
    return v === 'VALIDADA' ? ', validada pelo orientador' : ', não validada pelo orientador';
  }

  // Seleção
  isSelected(projectId: string, activityId: string): boolean {
    const s = this.selected();
    return s?.projectId === projectId && s.activityId === activityId;
  }
}
