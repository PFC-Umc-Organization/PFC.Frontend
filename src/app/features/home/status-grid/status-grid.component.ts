import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import {
  ProjectPenalties,
  ProjectStatusRow,
<<<<<<< HEAD
  STATUS_SHORT_LABEL,
=======
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  SubmissionStatus,
  ValidationStatus,
} from '../../../core/models';
import { CellState, cellStates } from '../../../core/services/submission-status';
import { StatusGrid } from '../../../core/services/submission.service';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { PenaltyCounterComponent } from '../../../shared/components/penalty-counter/penalty-counter.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

<<<<<<< HEAD
// Visões
=======
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
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
<<<<<<< HEAD
=======
  /** Sent after the deadline; the state says what happened to it since. */
  lateSubmission: boolean;
  /** Title of the first earlier activity still open, for a blocked cell. */
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  blockedBy?: string;
}

interface RowView {
  project: ProjectStatusRow['project'];
  cells: CellView[];
}

<<<<<<< HEAD
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
=======
export const CELL_LABEL: Record<CellState, string> = {
  waiting: 'Pendente',
  blocked: 'Bloqueado',
  late: 'Atrasado',
  waived: 'Perdoada',
  review: 'Em validação',
  returned: 'Devolvida',
  done: 'Concluído',
};

const CELL_ICON: Record<CellState, IconName> = {
  waiting: 'calendar',
  blocked: 'lock',
  late: 'alert',
  waived: 'check',
  review: 'eye',
  returned: 'edit',
  done: 'check',
};

/** Past this many activities a cell keeps only its icon, so the table still fits the screen. */
const DENSE_FROM = 11;

export const LEGEND: { state: CellState; text: string }[] = [
  { state: 'waiting', text: 'Pendente: aguardando a entrega do grupo' },
  { state: 'blocked', text: 'Bloqueado: só abre depois da entrega anterior' },
  { state: 'late', text: 'Atrasado, sem entrega' },
  { state: 'waived', text: 'Atrasado, penalidade perdoada' },
  { state: 'review', text: 'Em validação pelo orientador' },
  { state: 'returned', text: 'Devolvida pelo orientador para correção' },
  { state: 'done', text: 'Concluído: validada' },
];

/** One row per project, its penalties, then one column per activity; a cell opens its detail. */
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
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
<<<<<<< HEAD
  readonly showCount = input(true);
=======
  /** The "N projetos" count: pointless for a student, who sees only their own. */
  readonly showCount = input(true);
  /** Cells and dates do nothing when false (a failed group can no longer submit). */
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  readonly interactive = input(true);
  readonly footerHint = input('Passe o mouse sobre uma data para ver o nome do entregável. Clique para ver o que cada grupo entregou.');
  readonly error = input('');
  readonly selected = input<CellRef | null>(null);
<<<<<<< HEAD
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

=======
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

  protected readonly legend = LEGEND;

  /** The date under the pointer or focus; its activity's name shows in the footer. */
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  protected readonly hovered = signal<string | null>(null);
  protected readonly hoveredActivity = computed(() => this.grid().activities.find((a) => a.id === this.hovered()));

  protected readonly dense = computed(() => this.grid().activities.length >= DENSE_FROM);

<<<<<<< HEAD
  protected readonly rows = computed<RowView[]>(() => {
    const titles = this.grid().activities.map((a) => a.titulo);
    return this.grid().rows.map((row) => {
      const states = cellStates(row.cells.map((c) => c.status));
=======
  /** Cells in activity order; one still due is blocked while an earlier one is open. */
  protected readonly rows = computed<RowView[]>(() => {
    const titles = this.grid().activities.map((a) => a.titulo);
    const penalties = this.penalties();
    return this.grid().rows.map((row) => {
      const waived = new Set(
        penalties
          ?.get(row.project.id)
          ?.penalidades.filter((p) => p.origem === 'PRAZO' && p.perdao && p.atividadeId)
          .map((p) => p.atividadeId),
      );
      const states = cellStates(row.cells.map((c) => ({ ...c, waived: waived.has(c.activityId) })));
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
      return {
        project: row.project,
        cells: row.cells.map<CellView>((c, i) => ({
          ...c,
          state: states[i].state,
<<<<<<< HEAD
=======
          lateSubmission: c.status === 'ENTREGUE_COM_ATRASO',
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
          blockedBy: states[i].blockedBy === undefined ? undefined : titles[states[i].blockedBy],
        })),
      };
    });
  });

  private readonly titles = computed(() => new Map(this.grid().activities.map((a) => [a.id, a.titulo])));

<<<<<<< HEAD
  // Título
=======
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  titleOf(activityId: string): string {
    return this.titles().get(activityId) ?? '';
  }

<<<<<<< HEAD
  // Rótulo
  label(status: SubmissionStatus): string {
    return STATUS_SHORT_LABEL[status];
  }

  // Texto
=======
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  text(state: CellState): string {
    return CELL_LABEL[state];
  }

<<<<<<< HEAD
  // Ícone
=======
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  icon(state: CellState): IconName {
    return CELL_ICON[state];
  }

<<<<<<< HEAD
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
=======
  /** The hover text: the state in full, and what a blocked cell waits for. */
  hint(c: CellView): string {
    switch (c.state) {
      case 'waiting':
        return 'Pendente: aguardando a entrega do grupo';
      case 'blocked':
        return c.blockedBy ? `Bloqueado: o grupo precisa entregar antes "${c.blockedBy}"` : 'Bloqueado: há entrega anterior em aberto';
      case 'late':
        return 'Atrasado: o prazo passou e não há entrega';
      case 'waived':
        return 'Atrasado: a penalidade foi perdoada';
      case 'review':
        return c.lateSubmission ? 'Entregue com atraso, aguardando a validação do orientador' : 'Aguardando a validação do orientador';
      case 'returned':
        return 'Devolvida pelo orientador: o grupo precisa corrigir e reenviar';
      case 'done':
        return c.lateSubmission ? 'Concluído: validada pelo orientador (entregue com atraso)' : 'Concluído: validada pelo orientador';
    }
  }

>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  isSelected(projectId: string, activityId: string): boolean {
    const s = this.selected();
    return s?.projectId === projectId && s.activityId === activityId;
  }
}
