import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Cohort, Program, Project, ProjectPenalties, ProjectStatusRow, User, cohortLabel, currentTerm, isInTerm, isStaff } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CohortService } from '../../../core/services/cohort.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProgramService } from '../../../core/services/program.service';
import { ProjectService } from '../../../core/services/project.service';
import { StatusGrid, SubmissionService } from '../../../core/services/submission.service';
import { UserService } from '../../../core/services/user.service';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { PenaltyPanelComponent } from '../penalty-panel/penalty-panel.component';
import { ProjectPanelComponent } from '../project-panel/project-panel.component';
import { ActivityGroupItem, ActivitySubmissionsComponent } from '../activity-submissions/activity-submissions.component';
import { CellRef, StatusGridComponent } from '../status-grid/status-grid.component';
import { SubmissionDetailComponent } from '../submission-detail/submission-detail.component';

const EMPTY_GRID: StatusGrid = { activities: [], rows: [], submissions: [] };

export type RowFilter = 'all' | 'failed' | 'late' | 'awaiting' | 'rejected' | 'no-advisor';

/** Each group's submissions in the chosen cohort, activity by activity. */
@Component({
  selector: 'app-staff-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, StatusGridComponent, SubmissionDetailComponent, PenaltyPanelComponent, ActivitySubmissionsComponent, ProjectPanelComponent, DeadlinePipe],
  templateUrl: './staff-home.component.html',
  styleUrl: './staff-home.component.scss',
})
export class StaffHomeComponent {
  private readonly submissionService = inject(SubmissionService);
  private readonly penaltyService = inject(PenaltyService);
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly isAdvisor = computed(() => this.auth.role() === 'ORIENTADOR');
  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  private readonly projectService = inject(ProjectService);

  protected readonly cohortLabel = cohortLabel;
  /** A failed read fills its `error`, shown with a retry; none of them lets an empty list pass as "no data". */
  private readonly cohortService = inject(CohortService);
  private readonly programService = inject(ProgramService);
  readonly cohorts = loadable({ source: () => this.cohortService.list(), initial: [] as Cohort[] });
  private readonly chosen = signal<string | null>(null);

  private readonly programs = loadable({ source: () => this.programService.list(), initial: [] as Program[] });

  /** An advisor's projects, to open on a cohort they follow; the coordination does not need them. */
  private readonly advised = loadable({
    source: () => this.projectService.list(),
    params: computed(() => (this.isAdvisor() ? true : null)),
    initial: [] as Project[],
  });
  readonly choosingCohort = computed(() => this.isAdvisor() && this.advised.loading() && !this.chosen());

  /**
   * The chosen cohort or, at first, one of the current term: for an advisor,
   * the first where they advise a project.
   */
  readonly cohortId = computed(() => {
    const cohorts = this.cohorts.value();
    const chosen = this.chosen();
    if (chosen && cohorts.some((c) => c.id === chosen)) {
      return chosen;
    }
    if (this.choosingCohort()) {
      return '';
    }
    const term = currentTerm();
    let candidates = cohorts;
    if (this.isAdvisor()) {
      const programs = new Set(this.advised.value().map((p) => p.programaId));
      const followed = cohorts.filter((c) => this.programs.value().some((p) => p.cursoId === c.id && programs.has(p.id)));
      if (followed.length) {
        candidates = followed;
      }
    }
    return (candidates.find((c) => isInTerm(c, term)) ?? candidates[0])?.id ?? '';
  });
  /** May not exist yet. */
  readonly programId = computed(() => this.programs.value().find((p) => p.cursoId === this.cohortId())?.id);

  readonly gridLoad = loadable({
    source: (programId: string) => this.submissionService.statusGrid(programId),
    params: computed(() => this.programId() ?? null),
    initial: EMPTY_GRID,
  });
  readonly grid = this.gridLoad.value;
  readonly loading = this.gridLoad.loading;
  readonly error = this.gridLoad.error;

  /** The coordination's view: who advises each group, and the data to manage one. */
  private readonly userList = loadable({
    source: () => this.userService.list(),
    params: computed(() => (this.isAdmin() ? true : null)),
    initial: [] as User[],
  });
  private readonly users = this.userList.value;
  readonly advisors = computed(() => this.users().filter((u) => isStaff(u.perfil)));
  readonly nameByRgm = (rgm: string): string => this.users().find((u) => u.rgm === rgm)?.nome ?? rgm;

  readonly projectList = loadable({
    source: (programId: string) => this.projectService.list(programId),
    params: computed(() => (this.isAdmin() ? (this.programId() ?? null) : null)),
    initial: [] as Project[],
  });
  readonly projects = this.projectList.value;

  /** Advisors of at least one group of this cohort, for the filter; empty until projects and accounts load. */
  readonly gridAdvisors = computed(() => {
    const ids = new Set(this.projects().map((p) => p.orientadorId));
    return this.advisors().filter((a) => ids.has(a.id));
  });
  readonly advisorFilter = signal('');
  /** The chosen advisor, only while they advise a group of the cohort on screen. */
  private readonly activeAdvisor = computed(() =>
    this.gridAdvisors().some((a) => a.id === this.advisorFilter()) ? this.advisorFilter() : '',
  );

  setAdvisorFilter(event: Event): void {
    this.advisorFilter.set((event.target as HTMLSelectElement).value);
  }

  readonly selectedProject = signal<string | null>(null);
  readonly projectDetail = computed(() => this.projects().find((p) => p.id === this.selectedProject()) ?? null);

  openProject(project: { projectId: string }): void {
    this.selected.set(null);
    this.penaltiesOf.set(null);
    this.selectedActivity.set(null);
    this.selectedProject.set(this.selectedProject() === project.projectId ? null : project.projectId);
  }

  /** After editing, assigning an advisor or deleting a group. */
  projectChanged(): void {
    this.gridLoad.reload();
    this.projectList.reload();
  }

  readonly search = signal('');
  readonly filter = signal<RowFilter>('all');
  readonly filtering = computed(
    () => this.search().trim() !== '' || this.filter() !== 'all' || this.activeAdvisor() !== '',
  );

  /**
   * Counted in projects, not cells: a cohort of hundreds of groups would turn
   * a cell count into noise. Failed is undefined while the penalties load.
   */
  readonly indicators = computed(() => {
    const { rows, activities } = this.grid();
    const submitted = (s: string) => s === 'ENTREGUE' || s === 'ENTREGUE_COM_ATRASO';
    const penalties = this.penalties();
    const now = new Date();
    const upcoming = activities.find((a) => new Date(a.prazo) > now);
    const delivered = upcoming
      ? rows.filter((r) => submitted(r.cells.find((c) => c.activityId === upcoming.id)?.status ?? '')).length
      : 0;
    return {
      total: rows.length,
      failed: penalties ? rows.filter((r) => penalties.get(r.project.id)?.reprovado).length : undefined,
      late: rows.filter((r) => r.cells.some((c) => c.status === 'ATRASADO')).length,
      awaiting: rows.filter((r) => r.cells.some((c) => submitted(c.status) && !c.validation)).length,
      next: upcoming ? { title: upcoming.titulo, deadline: upcoming.prazo, delivered, of: rows.length } : null,
    };
  });

  readonly visibleGrid = computed<StatusGrid>(() => {
    const grid = this.grid();
    const term = this.search().trim().toLocaleLowerCase('pt-BR');
    const keep = (row: ProjectStatusRow): boolean => {
      if (term && !row.project.nome.toLocaleLowerCase('pt-BR').includes(term)) {
        return false;
      }
      if (this.activeAdvisor() && row.project.orientadorId !== this.activeAdvisor()) {
        return false;
      }
      const submitted = (s: string) => s === 'ENTREGUE' || s === 'ENTREGUE_COM_ATRASO';
      switch (this.filter()) {
        case 'failed':
          return !!this.penalties()?.get(row.project.id)?.reprovado;
        case 'no-advisor':
          return !row.project.orientadorId;
        case 'late':
          return row.cells.some((c) => c.status === 'ATRASADO');
        case 'awaiting':
          return row.cells.some((c) => submitted(c.status) && !c.validation);
        case 'rejected':
          return row.cells.some((c) => c.validation === 'NAO_VALIDADA');
      }
      return true;
    };
    return { ...grid, rows: grid.rows.filter(keep) };
  });

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setFilter(event: Event): void {
    this.filter.set((event.target as HTMLSelectElement).value as RowFilter);
  }

  /** An indicator card filters the grid; clicking the active one clears it. */
  toggleFilter(filter: RowFilter): void {
    this.filter.set(this.filter() === filter ? 'all' : filter);
  }

  readonly emptyText = computed(() => {
    if (this.grid().rows.length && this.filtering()) {
      return 'Nenhum projeto desta turma corresponde aos filtros.';
    }
    if (this.error()) {
      return 'Os projetos da turma não foram carregados.';
    }
    if (!this.programId()) {
      return 'Esta turma ainda não tem programa de PFC. Crie o programa em Turmas e PFC.';
    }
    return this.isAdvisor() ? 'Nenhum projeto desta turma tem você como orientador.' : 'Nenhum projeto cadastrado nesta turma.';
  });

  private readonly penaltyList = loadable({
    source: (programId: string) => this.penaltyService.ofProgram(programId),
    params: computed(() => this.programId() ?? null),
    initial: [] as ProjectPenalties[],
  });
  /** Undefined while loading or after a failure: the counters and statuses are left out, the grid still works. */
  readonly penalties = computed(() =>
    this.penaltyList.loading() || this.penaltyList.error()
      ? undefined
      : new Map(this.penaltyList.value().map((p): [string, ProjectPenalties] => [p.projetoId, p])),
  );

  /** What failed to load, for the notice with the retry button. */
  readonly loadFailures = computed(() =>
    [
      { what: 'as turmas', error: this.cohorts.error() },
      { what: 'os programas de PFC', error: this.programs.error() },
      { what: 'os seus projetos', error: this.advised.error() },
      { what: 'os projetos da turma', error: this.error() },
      { what: 'os nomes e orientadores', error: this.userList.error() || this.projectList.error() },
      { what: 'as penalidades', error: this.penaltyList.error() },
    ].filter((f) => f.error),
  );

  retryLoad(): void {
    this.cohorts.reload();
    this.programs.reload();
    this.advised.reload();
    this.gridLoad.reload();
    this.userList.reload();
    this.projectList.reload();
    this.penaltyList.reload();
  }

  readonly selected = signal<CellRef | null>(null);
  readonly penaltiesOf = signal<{ projectId: string; projectName: string } | null>(null);
  readonly penaltyDetail = computed(() => {
    const chosen = this.penaltiesOf();
    const penalties = chosen && this.penalties()?.get(chosen.projectId);
    return chosen && penalties ? { ...chosen, penalties } : null;
  });

  readonly selectedActivity = signal<string | null>(null);

  /** Every visible group's delivery for the chosen activity, from the grid: no call. */
  readonly activityDetail = computed(() => {
    const activityId = this.selectedActivity();
    const grid = this.visibleGrid();
    const activity = activityId ? grid.activities.find((a) => a.id === activityId) : undefined;
    if (!activity) {
      return null;
    }
    const items = grid.rows.flatMap<ActivityGroupItem>((row) => {
      const cell = row.cells.find((c) => c.activityId === activity.id);
      if (!cell) {
        return [];
      }
      const submission =
        grid.submissions.find((s) => s.projetoId === row.project.id && s.atividadeId === activity.id) ?? null;
      return [
        { projectId: row.project.id, projectName: row.project.nome, status: cell.status, validation: cell.validation, submission },
      ];
    });
    return { activity, items };
  });

  openActivity(activityId: string): void {
    this.selected.set(null);
    this.penaltiesOf.set(null);
    this.selectedProject.set(null);
    this.selectedActivity.set(this.selectedActivity() === activityId ? null : activityId);
  }

  openGroupOf(project: { projectId: string; projectName: string }): void {
    const activityId = this.selectedActivity();
    if (activityId) {
      this.openCell({ ...project, activityId });
    }
  }

  openCell(cell: CellRef): void {
    this.penaltiesOf.set(null);
    this.selectedActivity.set(null);
    this.selectedProject.set(null);
    this.selected.set(cell);
  }

  openPenalties(project: { projectId: string; projectName: string }): void {
    this.selected.set(null);
    this.selectedActivity.set(null);
    this.selectedProject.set(null);
    this.penaltiesOf.set(project);
  }

  /** Taken from the grid: opening a cell makes no call. */
  readonly detail = computed(() => {
    const cell = this.selected();
    const activity = cell && this.grid().activities.find((a) => a.id === cell.activityId);
    if (!cell || !activity) {
      return null;
    }
    const submission =
      this.grid().submissions.find((s) => s.projetoId === cell.projectId && s.atividadeId === cell.activityId) ?? null;
    return { ...cell, activity, submission };
  });

  chooseCohort(event: Event): void {
    this.chosen.set((event.target as HTMLSelectElement).value);
  }
}
