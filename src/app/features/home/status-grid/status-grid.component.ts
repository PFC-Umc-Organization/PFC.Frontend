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
  /** Title of the first earlier activity still open, for a blocked cell. */
  blockedBy?: string;
}

interface RowView {
  project: ProjectStatusRow['project'];
  cells: CellView[];
}

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

/** Past this many activities a cell keeps only its icon, so the table still fits the screen. */
const DENSE_FROM = 11;

export const LEGEND: { state: CellState; text: string }[] = [
  { state: 'done', text: 'Concluído no prazo' },
  { state: 'done-late', text: 'Concluído com atraso' },
  { state: 'late', text: 'Atrasado, sem entrega' },
  { state: 'waiting', text: 'Aguardando entrega' },
  { state: 'blocked', text: 'Bloqueado: só abre depois da entrega anterior' },
];

/** One row per project, its penalties, then one column per activity; a cell opens its detail. */
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
  /** The "N projetos" count: pointless for a student, who sees only their own. */
  readonly showCount = input(true);
  /** Cells and dates do nothing when false (a failed group can no longer submit). */
  readonly interactive = input(true);
  readonly footerHint = input('Passe o mouse sobre uma data para ver o nome do entregável. Clique para ver o que cada grupo entregou.');
  readonly error = input('');
  readonly selected = input<CellRef | null>(null);
  /** What the empty table says. */
  readonly emptyText = input.required<string>();
  readonly open = output<CellRef>();
  /** The column whose title was opened, to mark it. */
  readonly selectedActivity = input<string | null>(null);
  readonly openActivity = output<string>();
  /** The coordination opens a project from its name. */
  readonly projectsOpenable = input(false);
  readonly selectedProject = input<string | null>(null);
  readonly openProject = output<{ projectId: string; projectName: string }>();
  /** By project id, undefined while loading; a project without an entry shows no counter. */
  readonly penalties = input<Map<string, ProjectPenalties> | undefined>(new Map());
  readonly selectedPenalties = input<string | null>(null);
  readonly openPenalties = output<{ projectId: string; projectName: string }>();

  protected readonly legend = LEGEND;

  /** The date under the pointer or focus; its activity's name shows in the footer. */
  protected readonly hovered = signal<string | null>(null);
  protected readonly hoveredActivity = computed(() => this.grid().activities.find((a) => a.id === this.hovered()));

  protected readonly dense = computed(() => this.grid().activities.length >= DENSE_FROM);

  /** Cells in activity order; one still due is blocked while an earlier one is open. */
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

  titleOf(activityId: string): string {
    return this.titles().get(activityId) ?? '';
  }

  label(status: SubmissionStatus): string {
    return STATUS_SHORT_LABEL[status];
  }

  text(state: CellState): string {
    return CELL_LABEL[state];
  }

  icon(state: CellState): IconName {
    return CELL_ICON[state];
  }

  /** The hover text: the state in full, and what a blocked cell waits for. */
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

  validationText(v: ValidationStatus | undefined): string {
    if (!v) {
      return '';
    }
    return v === 'VALIDADA' ? ', validada pelo orientador' : ', não validada pelo orientador';
  }

  isSelected(projectId: string, activityId: string): boolean {
    const s = this.selected();
    return s?.projectId === projectId && s.activityId === activityId;
  }
}
