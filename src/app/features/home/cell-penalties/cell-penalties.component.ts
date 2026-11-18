import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { Activity, ProjectPenalties } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { action } from '../../../core/state/action';
import { PenaltyListComponent } from '../../../shared/components/penalty-list/penalty-list.component';

/**
 * The penalties of one group for one activity, in the activity's own panel:
 * the staff forgives the one a missed deadline cost, or applies one for it.
 * Penalties tied to no activity still on the grid are listed apart.
 */
@Component({
  selector: 'app-cell-penalties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PenaltyListComponent],
  templateUrl: './cell-penalties.component.html',
  styleUrl: './cell-penalties.component.scss',
})
export class CellPenaltiesComponent {
  private readonly penaltyService = inject(PenaltyService);
  private readonly confirmation = inject(ConfirmationService);

  readonly projectName = input.required<string>();
  readonly activity = input.required<Activity>();
  readonly activities = input.required<Activity[]>();
  readonly penalties = input.required<ProjectPenalties>();

  protected readonly ofActivity = computed(() =>
    this.penalties().penalidades.filter((p) => p.atividadeId === this.activity().id),
  );
  protected readonly others = computed(() => {
    const known = new Set(this.activities().map((a) => a.id));
    return this.penalties().penalidades.filter((p) => !p.atividadeId || !known.has(p.atividadeId));
  });

  /** What the staff needs to know about the group, only when it can no longer submit. */
  protected readonly failedText = computed(() => {
    const { ativas, limite, reprovado } = this.penalties();
    if (!reprovado) {
      return '';
    }
    const toWaive = ativas - limite + 1;
    return `O grupo está reprovado e não pode enviar entregas. Para liberar o envio, é preciso perdoar ${toWaive === 1 ? '1 penalidade' : `${toWaive} penalidades`}.`;
  });

  readonly applying = signal(false);
  readonly reason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] });
  private readonly missingReason = signal('');
  private readonly applyAction = action(
    (projectId: string, motivo: string) => this.penaltyService.apply(projectId, { motivo, atividadeId: this.activity().id }),
    {
      onSuccess: () => {
        this.reason.reset();
        this.applying.set(false);
      },
    },
  );
  readonly busy = this.applyAction.pending;
  readonly error = computed(() => this.missingReason() || this.applyAction.error());

  startApplying(): void {
    this.missingReason.set('');
    this.applying.set(true);
  }

  async apply(): Promise<void> {
    const motivo = this.reason.value.trim();
    if (!motivo) {
      this.reason.markAsTouched();
      this.missingReason.set('Informe o motivo da penalidade.');
      return;
    }
    const { ativas, limite } = this.penalties();
    const after = ativas + 1;
    const consequence =
      after >= limite
        ? `Com ${after} de ${limite}, o grupo fica reprovado e não poderá mais enviar entregas até que uma penalidade seja perdoada.`
        : `O grupo passará de ${ativas} para ${after} de ${limite} penalidades ativas.`;
    const confirmed = await this.confirmation.confirm({
      title: 'Aplicar penalidade',
      message: `Aplicar uma penalidade ao grupo ${this.projectName()}? ${consequence} A penalidade não pode ser apagada, apenas perdoada com motivo.`,
      confirmText: 'Aplicar penalidade',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.missingReason.set('');
    this.applyAction.run(this.penalties().projetoId, motivo);
  }
}
