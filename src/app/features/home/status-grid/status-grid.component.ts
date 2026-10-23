import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { STATUS_SHORT_LABEL, SubmissionStatus } from '../../../core/models';

import { StatusGrid } from '../../../core/services/submission.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

export interface CellRef {
  projectId: string;
  projectName: string;
  activityId: string;
}

/** One row per project, one column per activity; a cell opens its detail. */
@Component({
  selector: 'app-status-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, StatusBadgeComponent],
  templateUrl: './status-grid.component.html',
  styleUrl: './status-grid.component.scss',
})
export class StatusGridComponent {
  readonly grid = input.required<StatusGrid>();
  readonly loading = input(false);
  readonly error = input('');
  readonly selected = input<CellRef | null>(null);
  /** What the empty table says. */
  readonly emptyText = input.required<string>();
  readonly open = output<CellRef>();

  private readonly titles = computed(() => new Map(this.grid().activities.map((a) => [a.id, a.titulo])));

  titleOf(activityId: string): string {
    return this.titles().get(activityId) ?? '';
  }

  label(status: SubmissionStatus): string {
    return STATUS_SHORT_LABEL[status];
  }

  isSelected(projectId: string, activityId: string): boolean {
    const s = this.selected();
    return s?.projectId === projectId && s.activityId === activityId;
  }
}
