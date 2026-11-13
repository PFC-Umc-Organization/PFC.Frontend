import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Penalty, penaltyTitle } from '../../../core/models';
import { PenaltyService } from '../../../core/services/penalty.service';
import { action } from '../../../core/state/action';

/** The group's penalties, active then waived; the staff waives one with a reason. */
@Component({
  selector: 'app-penalty-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgTemplateOutlet, ReactiveFormsModule],
  templateUrl: './penalty-list.component.html',
  styleUrl: './penalty-list.component.scss',
})
export class PenaltyListComponent {
  private readonly penaltyService = inject(PenaltyService);

  readonly penalties = input.required<Penalty[]>();
  readonly projectId = input('');
  readonly manageable = input(false);

  protected readonly title = penaltyTitle;
  protected readonly active = computed(() => this.penalties().filter((p) => !p.perdao));
  protected readonly waived = computed(() => this.penalties().filter((p) => p.perdao));
  readonly waiving = signal<string | null>(null);
  readonly reason = new FormControl('', { nonNullable: true });
  private readonly waiveAction = action(
    (projectId: string, id: string, reason: string) => this.penaltyService.waive(projectId, id, reason),
    { onSuccess: () => this.waiving.set(null), onError: (e) => this.error.set(e.message) },
  );
  readonly busy = this.waiveAction.pending;
  readonly error = signal('');

  start(penalty: Penalty): void {
    this.waiving.set(penalty.id);
    this.reason.reset();
    this.error.set('');
  }

  waive(penalty: Penalty): void {
    const reason = this.reason.value.trim();
    if (!reason) {
      this.error.set('Informe o motivo do perdão.');
      return;
    }
    this.error.set('');
    this.waiveAction.run(this.projectId(), penalty.id, reason);
  }
}
