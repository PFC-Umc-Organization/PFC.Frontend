import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { cohortLabel } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { ActivitySubmissionsComponent } from '../activity-submissions/activity-submissions.component';
import { ProjectPanelComponent } from '../project-panel/project-panel.component';
import { CellRef, StatusGridComponent } from '../status-grid/status-grid.component';
import { SubmissionDetailComponent } from '../submission-detail/submission-detail.component';
import { RowFilter, activityDetailOf, cellDetailOf, indicatorsOf, visibleGridOf } from './staff-home.grid';
import { StaffHomeStore } from './staff-home.store';

// Tipos
export type { RowFilter } from './staff-home.grid';

type GroupRef = { projectId: string; projectName: string };

// Componente
@Component({
  selector: 'app-staff-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, StatusGridComponent, SubmissionDetailComponent, ActivitySubmissionsComponent, ProjectPanelComponent, DeadlinePipe],
  providers: [StaffHomeStore],
  templateUrl: './staff-home.component.html',
  styleUrl: './staff-home.component.scss',
})
export class StaffHomeComponent {
  protected readonly store = inject(StaffHomeStore);
  protected readonly cohortLabel = cohortLabel;

  // ---------------------------------------------------------------------------
  // Filtros
  // ---------------------------------------------------------------------------

  readonly search = signal('');
  readonly filter = signal<RowFilter>('all');
  readonly advisorFilter = signal('');
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

  // Busca
  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  // Filtro de situação
  setFilter(event: Event): void {
    this.filter.set((event.target as HTMLSelectElement).value as RowFilter);
  }

  // Filtro de orientador
  setAdvisorFilter(event: Event): void {
    this.advisorFilter.set((event.target as HTMLSelectElement).value);
  }

  // Alternância
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

  // ---------------------------------------------------------------------------
  // Seleção
  // ---------------------------------------------------------------------------

  readonly selected = signal<CellRef | null>(null);
  readonly selectedActivity = signal<string | null>(null);
  readonly selectedProject = signal<string | null>(null);

  readonly projectDetail = computed(() => this.store.projectById().get(this.selectedProject() ?? '') ?? null);
  readonly activityDetail = computed(() => activityDetailOf(this.visibleGrid(), this.selectedActivity()));
  readonly detail = computed(() => cellDetailOf(this.store.grid(), this.selected()));

  // Fechamento
  private closeAll(): void {
    this.selected.set(null);
    this.selectedActivity.set(null);
    this.selectedProject.set(null);
  }

  // Abertura de projeto
  openProject(project: { projectId: string }): void {
    const reopen = this.selectedProject() === project.projectId;
    this.closeAll();
    this.selectedProject.set(reopen ? null : project.projectId);
  }

  // Abertura de atividade
  openActivity(activityId: string): void {
    const reopen = this.selectedActivity() === activityId;
    this.closeAll();
    this.selectedActivity.set(reopen ? null : activityId);
  }

  // Abertura de célula
  openCell(cell: CellRef): void {
    this.closeAll();
    this.selected.set(cell);
  }

<<<<<<< HEAD
  // Abertura de penalidades
  openPenalties(project: GroupRef): void {
    this.closeAll();
    this.penaltiesOf.set(project);
  }

  // Abertura de grupo
=======
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  openGroupOf(project: GroupRef): void {
    const activityId = this.selectedActivity();
    if (activityId) {
      this.openCell({ ...project, activityId });
    }
  }

  // Seleção
  chooseCohort(event: Event): void {
    this.store.select((event.target as HTMLSelectElement).value);
  }
}
