import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ProjectPenalties, STATUS_SHORT_LABEL, SubmissionStatus, ValidationStatus } from '../../../core/models';
import { StatusGrid } from '../../../core/services/submission.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PenaltyCounterComponent } from '../../../shared/components/penalty-counter/penalty-counter.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

export interface CellRef {
  projectId: string;
  projectName: string;
  activityId: string;
}

/** One row per project, its penalties, then one column per activity; a cell opens its detail. */
@Component({
  selector: 'app-status-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, StatusBadgeComponent, PenaltyCounterComponent, ScrollHintDirective],
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
  /** By project id, undefined while loading; a project without an entry shows no counter. */
  readonly penalties = input<Map<string, ProjectPenalties> | undefined>(new Map());
  readonly selectedPenalties = input<string | null>(null);
  readonly openPenalties = output<{ projectId: string; projectName: string }>();

  private readonly titles = computed(() => new Map(this.grid().activities.map((a) => [a.id, a.titulo])));

  titleOf(activityId: string): string {
    return this.titles().get(activityId) ?? '';
  }

  label(status: SubmissionStatus): string {
    return STATUS_SHORT_LABEL[status];
  }

  validationText(v: ValidationStatus | undefined): string {
    if (!v) {
      return '';
    }
    return v === 'VALIDADA' ? ', validada pelo orientador' : ', não validada pelo orientador';
  }

  isSelected(projectId: string, activityId: string): boolean {
    const s = this.selected();
    return s?.projectId === projectId && s.activityId === activityId;
  }
}
