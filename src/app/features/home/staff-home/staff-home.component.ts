import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { cohortLabel } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { ActivitySubmissionsComponent } from '../activity-submissions/activity-submissions.component';
import { PenaltyPanelComponent } from '../penalty-panel/penalty-panel.component';
import { ProjectPanelComponent } from '../project-panel/project-panel.component';
import { CellRef, StatusGridComponent } from '../status-grid/status-grid.component';
import { SubmissionDetailComponent } from '../submission-detail/submission-detail.component';
import { RowFilter, activityDetailOf, cellDetailOf, indicatorsOf, visibleGridOf } from './staff-home.grid';
import { StaffHomeStore } from './staff-home.store';

export type { RowFilter } from './staff-home.grid';

type GroupRef = { projectId: string; projectName: string };

/**
 * Each group's submissions in the chosen cohort, activity by activity. The data
 * is in `StaffHomeStore`; here is the filters and which panel is open.
 */
@Component({
  selector: 'app-staff-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, StatusGridComponent, SubmissionDetailComponent, PenaltyPanelComponent, ActivitySubmissionsComponent, ProjectPanelComponent, DeadlinePipe],
  providers: [StaffHomeStore],
  templateUrl: './staff-home.component.html',
  styleUrl: './staff-home.component.scss',
})
export class StaffHomeComponent {
  protected readonly store = inject(StaffHomeStore);
  protected readonly cohortLabel = cohortLabel;

  // Filters
  readonly search = signal('');
  readonly filter = signal<RowFilter>('all');
  readonly advisorFilter = signal('');
  /** The chosen advisor, only while they advise a group of the cohort on screen. */
  private readonly activeAdvisor = computed(() =>
    this.store.gridAdvisors().some((a) => a.id === this.advisorFilter()) ? this.advisorFilter() : '',
  );
  readonly filtering = computed(() => this.search().trim() !== '' || this.filter() !== 'all' || this.activeAdvisor() !== '');

  readonly indicators = computed(() => indicatorsOf(this.store.grid(), this.store.penalties()));
  readonly visibleGrid = computed(() =>
    visibleGridOf(this.store.grid(), {
      search: this.search(),
      advisorId: this.activeAdvisor(),
      filter: this.filter(),
      penalties: this.store.penalties(),
    }),
  );

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setFilter(event: Event): void {
    this.filter.set((event.target as HTMLSelectElement).value as RowFilter);
  }

  setAdvisorFilter(event: Event): void {
    this.advisorFilter.set((event.target as HTMLSelectElement).value);
  }

  /** An indicator card filters the grid; clicking the active one clears it. */
  toggleFilter(filter: RowFilter): void {
    this.filter.set(this.filter() === filter ? 'all' : filter);
  }

  readonly emptyText = computed(() => {
    if (this.store.grid().rows.length && this.filtering()) {
      return 'Nenhum projeto desta turma corresponde aos filtros.';
    }
    if (this.store.gridLoad.error()) {
      return 'Os projetos da turma não foram carregados.';
    }
    if (!this.store.programId()) {
      return 'Esta turma ainda não tem programa de PFC. Crie o programa em Turmas e PFC.';
    }
    return this.store.isAdmin() ? 'Nenhum projeto cadastrado nesta turma.' : 'Nenhum projeto desta turma tem você como orientador.';
  });

  // The panel open under the grid: one at a time.
  readonly selected = signal<CellRef | null>(null);
  readonly selectedActivity = signal<string | null>(null);
  readonly selectedProject = signal<string | null>(null);
  readonly penaltiesOf = signal<GroupRef | null>(null);

  readonly projectDetail = computed(() => this.store.projectById().get(this.selectedProject() ?? '') ?? null);
  readonly activityDetail = computed(() => activityDetailOf(this.visibleGrid(), this.selectedActivity()));
  readonly detail = computed(() => cellDetailOf(this.store.grid(), this.selected()));
  readonly penaltyDetail = computed(() => {
    const chosen = this.penaltiesOf();
    const penalties = chosen && this.store.penalties()?.get(chosen.projectId);
    return chosen && penalties ? { ...chosen, penalties } : null;
  });

  private closeAll(): void {
    this.selected.set(null);
    this.selectedActivity.set(null);
    this.selectedProject.set(null);
    this.penaltiesOf.set(null);
  }

  openProject(project: { projectId: string }): void {
    const reopen = this.selectedProject() === project.projectId;
    this.closeAll();
    this.selectedProject.set(reopen ? null : project.projectId);
  }

  openActivity(activityId: string): void {
    const reopen = this.selectedActivity() === activityId;
    this.closeAll();
    this.selectedActivity.set(reopen ? null : activityId);
  }

  openCell(cell: CellRef): void {
    this.closeAll();
    this.selected.set(cell);
  }

  openPenalties(project: GroupRef): void {
    this.closeAll();
    this.penaltiesOf.set(project);
  }

  openGroupOf(project: GroupRef): void {
    const activityId = this.selectedActivity();
    if (activityId) {
      this.openCell({ ...project, activityId });
    }
  }

  chooseCohort(event: Event): void {
    this.store.select((event.target as HTMLSelectElement).value);
  }
}
