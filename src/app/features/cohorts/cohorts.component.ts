import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { IconComponent } from '../../shared/components/icon/icon.component';
import { ActivityScheduleComponent } from '../pfc-management/activity-schedule/activity-schedule.component';
import { NewActivityComponent } from '../pfc-management/new-activity/new-activity.component';
import { PfcManagementStore } from '../pfc-management/pfc-management.store';
import { ProjectSectionComponent } from '../pfc-management/project-section/project-section.component';
import { CohortsStore } from './cohorts.store';
import { StructureSectionComponent } from './structure-section/structure-section.component';

type Section = 'structure' | 'projects' | 'activities';

/**
 * The coordination's setup of a term: courses with their cohorts and PFC
 * programs in one list, the groups with their status and the activities.
 */
@Component({
  selector: 'app-cohorts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, StructureSectionComponent, ProjectSectionComponent, NewActivityComponent, ActivityScheduleComponent],
  providers: [CohortsStore, PfcManagementStore],
  templateUrl: './cohorts.component.html',
})
export class CohortsComponent {
  readonly sections: { id: Section; label: string }[] = [
    { id: 'structure', label: 'Cursos e turmas' },
    { id: 'projects', label: 'PFCs dos alunos' },
    { id: 'activities', label: 'Atividades' },
  ];
  readonly section = signal<Section>('structure');
  readonly activityFormOpen = signal(false);

  protected readonly store = inject(PfcManagementStore);
}
