import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import {
  ProjectPenalties,
  ProjectStatusRow,
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

export interface CellMenuRequest {
  cell: CellRef;
  state: CellState;
  rect: DOMRect;
}

interface CellView {
  activityId: string;
  status: SubmissionStatus;
  validation?: ValidationStatus;
  state: CellState;
  lateSubmission: boolean;
  // Bloqueio
  blockedBy?: string;
}

interface RowView {
  project: ProjectStatusRow['project'];
  cells: CellView[];
}

// Rótulos
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

// Densidade
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
  // Interação
  readonly interactive = input(true);
  readonly footerHint = input('Passe o mouse sobre uma data para ver o nome do entregável. Clique para ver o que cada grupo entregou.');
  readonly error = input('');
  readonly selected = input<CellRef | null>(null);
  readonly emptyText = input.required<string>();
  readonly open = output<CellRef>();
  // Seleção
  readonly selectedActivity = input<string | null>(null);
  readonly openActivity = output<string>();
  // Abertura
  readonly projectsOpenable = input(false);
  readonly selectedProject = input<string | null>(null);
  readonly openProject = output<{ projectId: string; projectName: string }>();
  // Penalidades
  readonly penalties = input<Map<string, ProjectPenalties> | undefined>(new Map());
  // Integrantes
  readonly members = input<ReadonlyMap<string, { rgm: string; nome: string }[]>>(new Map());
  // Menu rápido
  readonly quickMenu = input(false);
  readonly menu = output<CellMenuRequest>();

  protected readonly legend = LEGEND;

  // Foco
  protected readonly hovered = signal<string | null>(null);
  protected readonly hoveredActivity = computed(() => this.grid().activities.find((a) => a.id === this.hovered()));

  protected readonly dense = computed(() => this.grid().activities.length >= DENSE_FROM);

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
      return {
        project: row.project,
        cells: row.cells.map<CellView>((c, i) => ({
          ...c,
          state: states[i].state,
          lateSubmission: c.status === 'ENTREGUE_COM_ATRASO',
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

  // Integrantes
  memberNames(projectId: string): string {
    return (this.members().get(projectId) ?? []).map((m) => m.nome).join(', ');
  }

  // Ativação
  activate(event: Event, row: RowView, cell: CellView): void {
    const ref: CellRef = { projectId: row.project.id, projectName: row.project.nome, activityId: cell.activityId };
    if (this.quickMenu()) {
      this.menu.emit({ cell: ref, state: cell.state, rect: (event.currentTarget as HTMLElement).getBoundingClientRect() });
      return;
    }
    this.open.emit(ref);
  }

  isSelected(projectId: string, activityId: string): boolean {
    const s = this.selected();
    return s?.projectId === projectId && s.activityId === activityId;
  }
}
