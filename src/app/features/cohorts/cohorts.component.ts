import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { IconComponent } from '../../shared/components/icon/icon.component';
import { ActivityScheduleComponent } from '../pfc-management/activity-schedule/activity-schedule.component';
import { NewActivityComponent } from '../pfc-management/new-activity/new-activity.component';
import { PfcManagementStore } from '../pfc-management/pfc-management.store';
import { CohortsStore } from './cohorts.store';
import { StructureSectionComponent } from './structure-section/structure-section.component';

// Tipo
type Section = 'structure' | 'activities';

// Componente
@Component({
  selector: 'app-cohorts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, StructureSectionComponent, NewActivityComponent, ActivityScheduleComponent],
  providers: [CohortsStore, PfcManagementStore],
  templateUrl: './cohorts.component.html',
})
export class CohortsComponent {
  readonly sections: { id: Section; label: string }[] = [
    { id: 'structure', label: 'Cursos e turmas' },
    { id: 'activities', label: 'Atividades' },
  ];
  readonly section = signal<Section>('structure');
  readonly activityFormOpen = signal(false);

  protected readonly store = inject(PfcManagementStore);
}
