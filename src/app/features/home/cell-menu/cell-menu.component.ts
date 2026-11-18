import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { ConfirmationService } from '../../../core/services/confirmation.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { CellState } from '../../../core/services/submission-status';
import { SubmissionService } from '../../../core/services/submission.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CellRef } from '../status-grid/status-grid.component';

// Tipo
export interface CellMenuRef extends CellRef {
  state: CellState;
  activityTitle: string;
  deadlinePassed: boolean;
  penaltyId?: string;
  top: number;
  left: number;
}

const WAIVE_REASON = 'Perdão registrado pelo painel de acompanhamento.';

// Componente
@Component({
  selector: 'app-cell-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './cell-menu.component.html',
  styleUrl: './cell-menu.component.scss',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class CellMenuComponent {
  private readonly submissionService = inject(SubmissionService);
  private readonly penaltyService = inject(PenaltyService);
  private readonly confirmation = inject(ConfirmationService);

  readonly cell = input.required<CellMenuRef>();
  readonly closed = output();
  readonly details = output();

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------

  private readonly handBackAction = action(
    (projectId: string, activityId: string) => this.submissionService.remove(projectId, activityId),
    { onSuccess: () => this.closed.emit() },
  );
  private readonly waiveAction = action(
    (projectId: string, penaltyId: string) => this.penaltyService.waive(projectId, penaltyId, WAIVE_REASON),
    { onSuccess: () => this.closed.emit() },
  );

  readonly pending = computed(() => this.handBackAction.pending() || this.waiveAction.pending());
  readonly error = computed(() => this.handBackAction.error() || this.waiveAction.error());

  private readonly hasSubmission = computed(() => ['review', 'returned', 'done'].includes(this.cell().state));
  readonly showHandBack = computed(() => this.hasSubmission());
  readonly showWaive = computed(() => this.cell().state === 'late' && !!this.cell().penaltyId);

  // Devolução
  async handBack(): Promise<void> {
    const c = this.cell();
    const after = c.deadlinePassed
      ? 'Como o prazo já encerrou, o grupo não poderá enviar novamente.'
      : 'O grupo poderá enviar novamente até o prazo.';
    const confirmed = await this.confirmation.confirm({
      title: 'Devolver para correção',
      message: `Devolver a entrega "${c.activityTitle}" ao grupo ${c.projectName}? As respostas e os arquivos enviados serão apagados. ${after}`,
      confirmText: 'Devolver',
      danger: true,
    });
    if (confirmed) {
      this.handBackAction.run(c.projectId, c.activityId);
    }
  }

  // Perdão
  async waive(): Promise<void> {
    const c = this.cell();
    const confirmed = await this.confirmation.confirm({
      title: 'Perdoar penalidade',
      message: `Perdoar a penalidade da atividade "${c.activityTitle}" do grupo ${c.projectName}? O grupo volta a poder enviar a entrega fora do prazo.`,
      confirmText: 'Perdoar',
    });
    if (confirmed && c.penaltyId) {
      this.waiveAction.run(c.projectId, c.penaltyId);
    }
  }
}
