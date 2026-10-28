import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ActivityScheduleComponent } from './activity-schedule/activity-schedule.component';
import { NewActivityComponent } from './new-activity/new-activity.component';
import { PfcManagementStore } from './pfc-management.store';
import { ProgramSectionComponent } from './program-section/program-section.component';
import { ProjectSectionComponent } from './project-section/project-section.component';

type Section = 'program' | 'projects' | 'activities';

@Component({
  selector: 'app-pfc-management',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgramSectionComponent, ProjectSectionComponent, NewActivityComponent, ActivityScheduleComponent],
  providers: [PfcManagementStore],
  templateUrl: './pfc-management.component.html',
})
export class PfcManagementComponent {
  protected readonly store = inject(PfcManagementStore);

  /** One section at a time. Programs are set up once per cohort and are the coordination's, so they come last. */
  readonly sections = computed<{ id: Section; label: string }[]>(() => [
    { id: 'projects', label: this.store.isAdmin() ? 'PFCs dos alunos' : 'Meus orientandos' },
    { id: 'activities', label: 'Atividades' },
    ...(this.store.isAdmin() ? [{ id: 'program' as const, label: 'Programas de PFC' }] : []),
  ]);
  readonly section = signal<Section>('projects');
  readonly activityFormOpen = signal(false);
}
