import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { combineLatest, map, scan, switchMap } from 'rxjs';

import { Project, ProjectPenalties, TimelineItem } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProjectService } from '../../../core/services/project.service';
import { StatusGrid, SubmissionService } from '../../../core/services/submission.service';
import { CellState, buildStatusGrid, cellStates, submissionStatus } from '../../../core/services/submission-status';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PenaltyCounterComponent } from '../../../shared/components/penalty-counter/penalty-counter.component';
import { PenaltyListComponent } from '../../../shared/components/penalty-list/penalty-list.component';
import { DeliveryMode, DeliveryPanelComponent } from '../delivery-panel/delivery-panel.component';
import { StatusGridComponent } from '../status-grid/status-grid.component';
import { TimelineComponent } from '../../../shared/components/timeline/timeline.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';

const EMPTY_GRID: StatusGrid = { activities: [], rows: [], submissions: [] };

// Tipo
interface Home {
  project: Project | null;
  items: TimelineItem[];
}

// Componente
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

  private readonly submitCount = toSignal(this.submissionService.changes().pipe(scan((n) => n + 1, 0)), { initialValue: 0 });

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

  // Nova tentativa
  retryGrid(): void {
    this.gridLoad.reload();
  }

  readonly penaltiesByProject = computed(() => {
    const p = this.penalties();
    return p ? new Map([[p.projetoId, p]]) : new Map<string, ProjectPenalties>();
  });

  readonly selectedActivity = signal<string | null>(null);

  private readonly states = computed(() => cellStates(this.grid().rows[0]?.cells ?? []));

  /** Activities the advisor sent back: the group has to fix and send them again. */
  readonly returned = computed(() => this.grid().activities.filter((_, i) => this.states()[i]?.state === 'returned'));

  readonly delivery = computed(() => {
    const project = this.project();
    const index = this.grid().activities.findIndex((a) => a.id === this.selectedActivity());
    if (!project || index < 0) {
      return null;
    }
    const activity = this.grid().activities[index];
    const { state, blockedBy } = this.states()[index];
    const modes: Record<CellState, DeliveryMode> = {
      waiting: 'open',
      blocked: 'blocked',
      late: 'closed',
      waived: 'closed',
      review: 'submitted',
      returned: 'submitted',
      done: 'submitted',
    };
    return {
      project,
      activity,
      mode: this.failed() ? 'failed' : modes[state],
      blockedBy: blockedBy === undefined ? '' : this.grid().activities[blockedBy].titulo,
      submission: this.grid().submissions.find((s) => s.projetoId === project.id && s.atividadeId === activity.id),
    };
  });

  // Abertura
  openActivity(activityId: string): void {
    this.selectedActivity.set(this.selectedActivity() === activityId ? null : activityId);
    if (this.selectedActivity()) {
      queueMicrotask(() =>
        document.getElementById('delivery-title')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }),
      );
    }
  }

<<<<<<< HEAD
  // Exibição
  showPenalties(): void {
    document.getElementById('penalties-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

=======
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
  readonly project = computed(() => this.home.value()?.project ?? null);
  private readonly penaltyLoad = loadable({
    source: (project: Project) => this.penaltyService.ofProject(project.id),
    params: this.project,
    initial: null as ProjectPenalties | null,
  });
  readonly penaltiesError = this.penaltyLoad.error;
  // Nova tentativa
  retryPenalties(): void {
    this.penaltyLoad.reload();
  }

  readonly penaltiesReady = computed(() => !this.project() || !this.penaltyLoad.loading());
  readonly penalties = this.penaltyLoad.value;
  readonly failed = computed(() => this.penalties()?.reprovado ?? false);

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
  readonly next = computed(() =>
    this.items()
      .filter((i) => i.status === 'PENDENTE')
      .reduce<TimelineItem | null>((best, i) => (!best || new Date(i.deadline) < new Date(best.deadline) ? i : best), null),
  );
  readonly pendingCount = computed(() => this.items().filter((i) => i.status === 'PENDENTE').length);
  readonly missed = computed(() => this.items().some((i) => i.status === 'ATRASADO'));

  // Prazo
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
