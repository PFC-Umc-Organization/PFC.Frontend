import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { combineLatest, map, scan, switchMap } from 'rxjs';

import { Project, ProjectPenalties, TimelineItem } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProjectService } from '../../../core/services/project.service';
import { StatusGrid, SubmissionService } from '../../../core/services/submission.service';
import { buildStatusGrid, cellStates, submissionStatus } from '../../../core/services/submission-status';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PenaltyCounterComponent } from '../../../shared/components/penalty-counter/penalty-counter.component';
import { PenaltyListComponent } from '../../../shared/components/penalty-list/penalty-list.component';
import { DeliveryMode, DeliveryPanelComponent } from '../delivery-panel/delivery-panel.component';
import { StatusGridComponent } from '../status-grid/status-grid.component';
import { TimelineComponent } from '../../../shared/components/timeline/timeline.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';

const EMPTY_GRID: StatusGrid = { activities: [], rows: [], submissions: [] };

interface Home {
  project: Project | null;
  items: TimelineItem[];
}

/**
 * The activities' schedule. Without a group the student still sees the
 * deadlines (activities are the same for every cohort) and a notice that
 * submitting is done by the group.
 */
@Component({
  selector: 'app-student-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusGridComponent, DeliveryPanelComponent, TimelineComponent, IconComponent, RouterLink, DeadlinePipe, PenaltyCounterComponent, PenaltyListComponent],
  templateUrl: './student-home.component.html',
  styleUrl: './student-home.component.scss',
})
export class StudentHomeComponent {
  private readonly submissionService = inject(SubmissionService);
  private readonly activityService = inject(ActivityService);
  private readonly penaltyService = inject(PenaltyService);
  private readonly projectService = inject(ProjectService);

  /** The student's group (or none) with the timeline; without a group, the plain schedule. Null until it arrives. */
  readonly home = loadable({
    source: () =>
      this.projectService
        .myProject()
        .pipe(
          switchMap((project) =>
            (project
              ? this.submissionService.projectTimeline(project.id, project.nome)
              : this.activityService.list().pipe(
                  map((activities) =>
                    activities.map<TimelineItem>((a) => ({
                      activityId: a.id,
                      title: a.titulo,
                      projectName: '',
                      deadline: a.prazo,
                      status: submissionStatus(a.prazo, undefined),
                    })),
                  ),
                )
            ).pipe(map((items): Home => ({ project, items }))),
          ),
        ),
    initial: null as Home | null,
  });

  /** Every submit moves it, so the grid reads again. */
  private readonly submitCount = toSignal(this.submissionService.changes().pipe(scan((n) => n + 1, 0)), { initialValue: 0 });

  /** The group's own row, in the same grid the staff reads; read again after every submit. */
  private readonly gridLoad = loadable({
    source: ({ project }: { project: Project; version: number }) =>
      combineLatest([this.activityService.list(), this.submissionService.ofProject(project.id)]).pipe(
        map(([activities, submissions]) => buildStatusGrid(activities, [project], submissions)),
      ),
    params: computed(() => {
      const project = this.project();
      return project ? { project, version: this.submitCount() } : null;
    }),
    initial: EMPTY_GRID,
  });
  readonly grid = this.gridLoad.value;
  readonly gridError = this.gridLoad.error;

  retryGrid(): void {
    this.gridLoad.reload();
  }

  /** The group's penalties by project id, as the grid reads them. */
  readonly penaltiesByProject = computed(() => {
    const p = this.penalties();
    return p ? new Map([[p.projetoId, p]]) : new Map<string, ProjectPenalties>();
  });

  /** The activity opened below the grid, to read, send or edit its submission. */
  readonly selectedActivity = signal<string | null>(null);

  readonly delivery = computed(() => {
    const project = this.project();
    const id = this.selectedActivity();
    const row = this.grid().rows[0];
    const index = this.grid().activities.findIndex((a) => a.id === id);
    if (!project || !row || index < 0) {
      return null;
    }
    const activity = this.grid().activities[index];
    const cell = cellStates(row.cells.map((c) => c.status))[index];
    const blockedBy = cell.blockedBy === undefined ? '' : this.grid().activities[cell.blockedBy].titulo;
    const mode: DeliveryMode = this.failed()
      ? 'failed'
      : cell.state === 'done' || cell.state === 'done-late'
        ? 'submitted'
        : cell.state === 'waiting'
          ? 'open'
          : cell.state === 'blocked'
            ? 'blocked'
            : 'closed';
    return {
      project,
      activity,
      mode,
      blockedBy,
      submission: this.grid().submissions.find((s) => s.projetoId === project.id && s.atividadeId === activity.id),
    };
  });

  /** A cell or a date opens the activity below the grid; the same one again closes it. */
  openActivity(activityId: string): void {
    this.selectedActivity.set(this.selectedActivity() === activityId ? null : activityId);
    if (this.selectedActivity()) {
      queueMicrotask(() =>
        document.getElementById('delivery-title')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }),
      );
    }
  }

  showPenalties(): void {
    document.getElementById('penalties-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  readonly project = computed(() => this.home.value()?.project ?? null);
  /**
   * Undefined while loading, so the top of the page waits instead of showing
   * "Próxima entrega" to a failed group; null without a group or on failure.
   */
  private readonly penaltyLoad = loadable({
    source: (project: Project) => this.penaltyService.ofProject(project.id),
    params: this.project,
    initial: null as ProjectPenalties | null,
  });
  readonly penaltiesError = this.penaltyLoad.error;
  retryPenalties(): void {
    this.penaltyLoad.reload();
  }

  readonly penaltiesReady = computed(() => !this.project() || !this.penaltyLoad.loading());
  readonly penalties = this.penaltyLoad.value;
  readonly failed = computed(() => this.penalties()?.reprovado ?? false);

  /** With a group, read from the grid so it follows every submit; without one, from the plain schedule. */
  readonly items = computed(() => {
    const row = this.grid().rows[0];
    if (this.project() && row) {
      return this.grid().activities.map<TimelineItem>((a, i) => ({
        activityId: a.id,
        title: a.titulo,
        projectName: row.project.nome,
        deadline: a.prazo,
        status: row.cells[i].status,
      }));
    }
    return this.home.value()?.items ?? [];
  });
  readonly error = computed(() => (this.home.error() ? `Não foi possível carregar as atividades. ${this.home.error()}` : ''));
  /** The pending activity with the closest deadline. */
  readonly next = computed(() =>
    this.items()
      .filter((i) => i.status === 'PENDENTE')
      .reduce<TimelineItem | null>((best, i) => (!best || new Date(i.deadline) < new Date(best.deadline) ? i : best), null),
  );
  readonly pendingCount = computed(() => this.items().filter((i) => i.status === 'PENDENTE').length);
  readonly missed = computed(() => this.items().some((i) => i.status === 'ATRASADO'));

  timeLeft(deadline: string, now = new Date()): string {
    const hours = Math.floor((new Date(deadline).getTime() - now.getTime()) / 3_600_000);
    if (hours < 1) {
      return 'O prazo encerra em menos de 1 hora';
    }
    if (hours < 24) {
      return hours === 1 ? 'Falta 1 hora' : `Faltam ${hours} horas`;
    }
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Falta 1 dia' : `Faltam ${days} dias`;
  }

  readonly description = computed(() => {
    const project = this.project();
    return project ? `Prazos e situação das entregas do grupo ${project.nome}.` : 'Prazos das atividades do PFC.';
  });
}
