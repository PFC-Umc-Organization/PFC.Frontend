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
  styleUrl: './pfc-management.component.scss',
})
export class PfcManagementComponent {
  private readonly store = inject(PfcManagementStore);

  /** One section at a time. Programs are the coordination's: an advisor starts at the projects. */
  readonly sections = computed<{ id: Section; label: string }[]>(() => [
    ...(this.store.isAdmin() ? [{ id: 'program' as const, label: 'Criar programa de PFC' }] : []),
    { id: 'projects', label: this.store.isAdmin() ? 'PFCs dos alunos' : 'Meus orientandos' },
    { id: 'activities', label: 'Atividades' },
  ]);
  readonly section = signal<Section>(this.store.isAdmin() ? 'program' : 'projects');
}
