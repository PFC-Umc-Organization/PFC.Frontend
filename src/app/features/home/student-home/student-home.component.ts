import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { Project, ProjectPenalties, TimelineItem } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProjectService } from '../../../core/services/project.service';
import { SubmissionService } from '../../../core/services/submission.service';
import { submissionStatus } from '../../../core/services/submission-status';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PenaltyCounterComponent } from '../../../shared/components/penalty-counter/penalty-counter.component';
import { PenaltyListComponent } from '../../../shared/components/penalty-list/penalty-list.component';
import { TimelineComponent } from '../../../shared/components/timeline/timeline.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; project: Project | null; items: TimelineItem[] };

/**
 * The activities' schedule. Without a group the student still sees the
 * deadlines (activities are the same for every cohort) and a notice that
 * submitting is done by the group.
 */
@Component({
  selector: 'app-student-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimelineComponent, IconComponent, RouterLink, DeadlinePipe, PenaltyCounterComponent, PenaltyListComponent],
  templateUrl: './student-home.component.html',
  styleUrl: './student-home.component.scss',
})
export class StudentHomeComponent {
  private readonly submissionService = inject(SubmissionService);
  private readonly activityService = inject(ActivityService);
  private readonly penaltyService = inject(PenaltyService);

  readonly state = toSignal(
    inject(ProjectService)
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
          ).pipe(map((items): State => ({ kind: 'ready', project, items }))),
        ),
        catchError((e: Error) => of<State>({ kind: 'error', message: e.message })),
        startWith<State>({ kind: 'loading' }),
      ),
    { initialValue: { kind: 'loading' } as State },
  );

  readonly project = computed(() => {
    const s = this.state();
    return s.kind === 'ready' ? s.project : null;
  });
  /**
   * Undefined while loading, so the top of the page waits instead of showing
   * "Próxima entrega" to a failed group; null without a group or on failure.
   */
  private readonly loadedPenalties = toSignal(
    toObservable(this.project).pipe(
      switchMap((project) =>
        project
          ? this.penaltyService.ofProject(project.id).pipe(
              catchError(() => of(null)),
              startWith(undefined),
            )
          : of(null),
      ),
    ),
    { initialValue: undefined as ProjectPenalties | null | undefined },
  );
  readonly penaltiesReady = computed(() => !this.project() || this.loadedPenalties() !== undefined);
  readonly penalties = computed(() => this.loadedPenalties() ?? null);
  readonly failed = computed(() => this.penalties()?.reprovado ?? false);

  readonly items = computed(() => {
    const s = this.state();
    return s.kind === 'ready' ? s.items : [];
  });
  readonly error = computed(() => {
    const s = this.state();
    return s.kind === 'error' ? `Não foi possível carregar as atividades: ${s.message}` : '';
  });
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
      return 'Vence em menos de 1 hora';
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
