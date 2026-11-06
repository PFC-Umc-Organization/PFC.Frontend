import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { IconComponent } from '../../shared/components/icon/icon.component';
import { ActivityScheduleComponent } from '../pfc-management/activity-schedule/activity-schedule.component';
import { NewActivityComponent } from '../pfc-management/new-activity/new-activity.component';
import { PfcManagementStore } from '../pfc-management/pfc-management.store';
import { ProgramSectionComponent } from '../pfc-management/program-section/program-section.component';
import { ProjectSectionComponent } from '../pfc-management/project-section/project-section.component';
import { CohortSectionComponent } from './cohort-section/cohort-section.component';
import { CohortsStore } from './cohorts.store';
import { CourseSectionComponent } from './course-section/course-section.component';

type Section = 'courses' | 'cohorts' | 'program' | 'projects' | 'activities';

/**
 * The coordination's setup of a term: courses and cohorts and, per cohort, its
 * PFC program, the groups with their status and the activities.
 */
@Component({
  selector: 'app-cohorts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent,
    CourseSectionComponent,
    CohortSectionComponent,
    ProgramSectionComponent,
    ProjectSectionComponent,
    NewActivityComponent,
    ActivityScheduleComponent,
  ],
  providers: [CohortsStore, PfcManagementStore],
  templateUrl: './cohorts.component.html',
})
export class CohortsComponent {
  readonly sections: { id: Section; label: string }[] = [
    { id: 'courses', label: 'Cursos' },
    { id: 'cohorts', label: 'Turmas' },
    { id: 'program', label: 'Programas de PFC' },
    { id: 'projects', label: 'PFCs dos alunos' },
    { id: 'activities', label: 'Atividades' },
  ];
  readonly section = signal<Section>('courses');
  readonly activityFormOpen = signal(false);

  protected readonly store = inject(PfcManagementStore);
}
