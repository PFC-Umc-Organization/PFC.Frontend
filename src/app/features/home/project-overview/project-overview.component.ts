import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ProjectPenalties } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PenaltyCounterComponent } from '../../../shared/components/penalty-counter/penalty-counter.component';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { PenaltyListComponent } from '../../../shared/components/penalty-list/penalty-list.component';
import { OverviewDelivery } from '../staff-home/staff-home.grid';
import { CELL_LABEL } from '../status-grid/status-grid.component';

// Componente
@Component({
  selector: 'app-project-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RevealDirective, IconComponent, PenaltyCounterComponent, PenaltyListComponent],
  templateUrl: './project-overview.component.html',
  styleUrl: './project-overview.component.scss',
})
export class ProjectOverviewComponent {
  readonly name = input.required<string>();
  readonly cohort = input('');
  readonly advisor = input('');
  readonly members = input<{ rgm: string; nome: string }[]>([]);
  readonly deliveries = input<OverviewDelivery[]>([]);
  readonly penalties = input<ProjectPenalties | undefined>();
  readonly penaltyFocus = input<number | null>(null);
  readonly selectedActivity = input<string | null>(null);
  readonly closed = output();
  readonly openDelivery = output<string>();

  protected readonly label = CELL_LABEL;
  protected readonly failedText = computed(() => (this.penalties()?.reprovado ? 'O grupo está reprovado e não pode enviar entregas.' : ''));
  protected readonly empty = computed(() => (this.penalties()?.penalidades.length ?? 0) === 0);
}
