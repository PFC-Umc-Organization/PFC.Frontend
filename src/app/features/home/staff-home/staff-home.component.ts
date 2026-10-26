import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap, tap } from 'rxjs';

import { Program, ProjectPenalties, cohortLabel, currentTerm, isInTerm } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CohortService } from '../../../core/services/cohort.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProgramService } from '../../../core/services/program.service';
import { StatusGrid, SubmissionService } from '../../../core/services/submission.service';
import { PenaltyPanelComponent } from '../penalty-panel/penalty-panel.component';
import { CellRef, StatusGridComponent } from '../status-grid/status-grid.component';
import { SubmissionDetailComponent } from '../submission-detail/submission-detail.component';

const EMPTY_GRID: StatusGrid = { activities: [], rows: [], submissions: [] };

/** Each group's submissions in the chosen cohort, activity by activity. */
@Component({
  selector: 'app-staff-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusGridComponent, SubmissionDetailComponent, PenaltyPanelComponent],
  templateUrl: './staff-home.component.html',
  styleUrl: './staff-home.component.scss',
})
export class StaffHomeComponent {
  private readonly submissionService = inject(SubmissionService);
  private readonly penaltyService = inject(PenaltyService);
  private readonly auth = inject(AuthService);
  private readonly isAdvisor = computed(() => this.auth.role() === 'ORIENTADOR');

  protected readonly cohortLabel = cohortLabel;
  readonly cohorts = toSignal(inject(CohortService).list(), { initialValue: [] });
  private readonly chosen = signal<string | null>(null);

  /** The chosen cohort or, at first, the first one of the current term. */
  readonly cohortId = computed(() => {
    const cohorts = this.cohorts();
    const chosen = this.chosen();
    if (chosen && cohorts.some((c) => c.id === chosen)) {
      return chosen;
    }
    const term = currentTerm();
    return (cohorts.find((c) => isInTerm(c, term)) ?? cohorts[0])?.id ?? '';
  });

  private readonly programs = toSignal(inject(ProgramService).list().pipe(catchError(() => of([] as Program[]))), {
    initialValue: [] as Program[],
  });
  /** May not exist yet. */
  readonly programId = computed(() => this.programs().find((p) => p.cursoId === this.cohortId())?.id);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly grid = toSignal(
    toObservable(this.programId).pipe(
      tap(() => this.error.set('')),
      switchMap((programId) => {
        if (!programId) {
          return of(EMPTY_GRID);
        }
        this.loading.set(true);
        return this.submissionService.statusGrid(programId).pipe(
          tap(() => this.loading.set(false)),
          catchError((e: Error) => {
            this.loading.set(false);
            this.error.set(e.message);
            return of(EMPTY_GRID);
          }),
        );
      }),
    ),
    { initialValue: EMPTY_GRID },
  );

  readonly emptyText = computed(() => {
    if (!this.programId()) {
      return 'Nenhum PFC iniciado para esta turma. Crie o programa em Gestão de PFC.';
    }
    return this.isAdvisor() ? 'Nenhum projeto desta turma tem você como orientador.' : 'Nenhum projeto cadastrado nesta turma.';
  });

  /** A failed load leaves the counters out; the grid still works. */
  readonly penalties = toSignal(
    toObservable(this.programId).pipe(
      switchMap((programId) =>
        programId
          ? this.penaltyService.ofProgram(programId).pipe(catchError(() => of([] as ProjectPenalties[])))
          : of([] as ProjectPenalties[]),
      ),
      map((list) => new Map(list.map((p) => [p.projetoId, p]))),
      startWith(undefined),
    ),
    { initialValue: undefined as Map<string, ProjectPenalties> | undefined },
  );

  readonly selected = signal<CellRef | null>(null);
  readonly penaltiesOf = signal<{ projectId: string; projectName: string } | null>(null);
  readonly penaltyDetail = computed(() => {
    const chosen = this.penaltiesOf();
    const penalties = chosen && this.penalties()?.get(chosen.projectId);
    return chosen && penalties ? { ...chosen, penalties } : null;
  });

  openCell(cell: CellRef): void {
    this.penaltiesOf.set(null);
    this.selected.set(cell);
  }

  openPenalties(project: { projectId: string; projectName: string }): void {
    this.selected.set(null);
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
