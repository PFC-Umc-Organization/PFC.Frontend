import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Activity, ProjectPenalties } from '../../../core/models';
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
        text: `${ativas === limite ? 'No' : 'Acima do'} limite de ${limite}. O grupo não entrega mais; para voltar, perdoe ${plural(toWaive)}.`,
      };
    }
    if (ativas === 0) {
      return { title: 'Sem penalidades', text: `O grupo é reprovado ao chegar a ${limite}.` };
    }
    const left = limite - ativas;
    return { title: left === 1 ? 'Em risco' : 'Dentro do limite', text: `Com mais ${plural(left)}, o grupo é reprovado.` };
  });

  readonly applying = signal(false);
  readonly error = signal('');

  apply(): void {
    const { motivo, atividadeId } = this.form.getRawValue();
    if (!motivo.trim()) {
      this.form.markAllAsTouched();
      this.error.set('Informe o motivo da penalidade.');
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
