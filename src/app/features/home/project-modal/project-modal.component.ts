import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, input, output } from '@angular/core';

import { Activity, Project, ProjectPenalties, Submission, User } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PenaltyCounterComponent } from '../../../shared/components/penalty-counter/penalty-counter.component';
import { PenaltyListComponent } from '../../../shared/components/penalty-list/penalty-list.component';
import { ProjectPanelComponent } from '../project-panel/project-panel.component';
import { OverviewDelivery } from '../staff-home/staff-home.grid';
import { CELL_ICON, CELL_LABEL } from '../status-grid/status-grid.component';
import { SubmissionDetailComponent } from '../submission-detail/submission-detail.component';

// Componente
@Component({
  selector: 'app-project-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, PenaltyCounterComponent, PenaltyListComponent, ProjectPanelComponent, SubmissionDetailComponent],
  templateUrl: './project-modal.component.html',
  styleUrl: './project-modal.component.scss',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class ProjectModalComponent {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly project = input.required<Project>();
  readonly cohort = input('');
  readonly advisorName = input('');
  readonly advisors = input<User[]>([]);
  readonly nameByRgm = input.required<(rgm: string) => string>();
  readonly manage = input(false);
  readonly deliveries = input<OverviewDelivery[]>([]);
  readonly activityId = input<string | null>(null);
  readonly activity = input<Activity | null>(null);
  readonly submission = input<Submission | null>(null);
  readonly activities = input<Activity[]>([]);
  readonly penalties = input<ProjectPenalties | undefined>();
  readonly section = input<'penalties' | null>(null);
  readonly closed = output();
  readonly changed = output();
  readonly choose = output<string>();

  protected readonly label = CELL_LABEL;
  protected readonly icon = CELL_ICON;
  protected readonly withPenalties = computed(() => (this.penalties()?.penalidades.length ?? 0) > 0);

  // Inicialização
  constructor() {
    afterNextRender(() => {
      if (this.section() === 'penalties') {
        this.el.querySelector('#project-penalties')?.scrollIntoView?.({ block: 'start' });
      }
    });
  }
}
