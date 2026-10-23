import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Penalty, penaltyTitle } from '../../../core/models';
import { PenaltyService } from '../../../core/services/penalty.service';

/** The group's penalties, oldest first; the staff waives one with a reason. */
@Component({
  selector: 'app-penalty-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './penalty-list.component.html',
  styleUrl: './penalty-list.component.scss',
})
export class PenaltyListComponent {
  private readonly penaltyService = inject(PenaltyService);

  readonly penalties = input.required<Penalty[]>();
  readonly projectId = input('');
  readonly manageable = input(false);

  protected readonly title = penaltyTitle;
  readonly waiving = signal<string | null>(null);
  readonly reason = new FormControl('', { nonNullable: true });
  readonly busy = signal(false);
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
    this.busy.set(true);
    this.penaltyService.waive(this.projectId(), penalty.id, reason).subscribe({
      next: () => {
        this.busy.set(false);
        this.waiving.set(null);
      },
      error: (e: Error) => {
        this.busy.set(false);
        this.error.set(e.message);
      },
    });
  }
}
