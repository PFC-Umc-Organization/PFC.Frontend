import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Activity, ProjectPenalties } from '../../../core/models';
import { PenaltyService } from '../../../core/services/penalty.service';
import { PenaltyCounterComponent } from '../../../shared/components/penalty-counter/penalty-counter.component';
import { PenaltyListComponent } from '../../../shared/components/penalty-list/penalty-list.component';

/** One group's penalties for the coordination or its advisor: waive or apply. */
@Component({
  selector: 'app-penalty-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PenaltyCounterComponent, PenaltyListComponent],
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
