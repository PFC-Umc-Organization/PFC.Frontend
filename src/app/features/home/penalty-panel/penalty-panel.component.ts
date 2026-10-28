import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Activity, ProjectPenalties } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PenaltyCounterComponent } from '../../../shared/components/penalty-counter/penalty-counter.component';
import { PenaltyListComponent } from '../../../shared/components/penalty-list/penalty-list.component';

/** One group's penalties for the coordination or its advisor: waive or apply. */
@Component({
  selector: 'app-penalty-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, PenaltyCounterComponent, PenaltyListComponent],
  templateUrl: './penalty-panel.component.html',
  styleUrl: './penalty-panel.component.scss',
})
export class PenaltyPanelComponent {
  private readonly penaltyService = inject(PenaltyService);
  private readonly confirmation = inject(ConfirmationService);

  readonly projectName = input.required<string>();
  readonly penalties = input.required<ProjectPenalties>();
  readonly activities = input<Activity[]>([]);
  readonly closed = output();

  readonly form = inject(FormBuilder).nonNullable.group({
    motivo: ['', [Validators.required, Validators.maxLength(500)]],
    atividadeId: [''],
  });
  /** What the team needs to know at a glance, and what to do about it. */
  protected readonly summary = computed(() => {
    const { ativas, limite, reprovado } = this.penalties();
    const plural = (n: number) => (n === 1 ? '1 penalidade' : `${n} penalidades`);
    if (reprovado) {
      const toWaive = ativas - limite + 1;
      return {
        title: 'Reprovado',
        text: `O grupo ${ativas === limite ? 'atingiu' : 'ultrapassou'} o limite de ${plural(limite)} e não pode enviar entregas. Para liberar o envio, é preciso perdoar ${plural(toWaive)}.`,
      };
    }
    if (ativas === 0) {
      return { title: 'Sem penalidades', text: `O grupo será reprovado se atingir ${plural(limite)} ativas.` };
    }
    const left = limite - ativas;
    return { title: left === 1 ? 'Em risco' : 'Dentro do limite', text: `O grupo será reprovado se receber mais ${plural(left)}.` };
  });

  readonly applying = signal(false);
  readonly error = signal('');

  async apply(): Promise<void> {
    const { motivo, atividadeId } = this.form.getRawValue();
    if (!motivo.trim()) {
      this.form.markAllAsTouched();
      this.error.set('Informe o motivo da penalidade.');
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
    this.error.set('');
    this.applying.set(true);
    this.penaltyService
      .apply(this.penalties().projetoId, { motivo: motivo.trim(), ...(atividadeId ? { atividadeId } : {}) })
      .subscribe({
        next: () => {
          this.applying.set(false);
          this.form.reset();
        },
        error: (e: Error) => {
          this.applying.set(false);
          this.error.set(e.message);
        },
      });
  }
}
