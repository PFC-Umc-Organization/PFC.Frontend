import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap, tap } from 'rxjs';

import { Program, Project, ProjectPenalties, ProjectStatusRow, cohortLabel, currentTerm, isInTerm } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CohortService } from '../../../core/services/cohort.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProgramService } from '../../../core/services/program.service';
import { ProjectService } from '../../../core/services/project.service';
import { StatusGrid, SubmissionService } from '../../../core/services/submission.service';
import { PenaltyPanelComponent } from '../penalty-panel/penalty-panel.component';
import { CellRef, StatusGridComponent } from '../status-grid/status-grid.component';
import { SubmissionDetailComponent } from '../submission-detail/submission-detail.component';

const EMPTY_GRID: StatusGrid = { activities: [], rows: [], submissions: [] };

export type RowFilter = 'all' | 'late' | 'awaiting' | 'rejected';

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

  private readonly programs = toSignal(inject(ProgramService).list().pipe(catchError(() => of([] as Program[]))), {
    initialValue: [] as Program[],
  });

  /** An advisor's projects, to open on a cohort they follow; undefined while loading. */
  private readonly advised = toSignal<Project[] | undefined>(
    this.isAdvisor() ? inject(ProjectService).list().pipe(catchError(() => of([] as Project[]))) : of([] as Project[]),
    { initialValue: undefined },
  );
  readonly choosingCohort = computed(() => this.isAdvisor() && this.advised() === undefined && !this.chosen());

  /**
   * The chosen cohort or, at first, one of the current term: for an advisor,
   * the first where they advise a project.
   */
  readonly cohortId = computed(() => {
    const cohorts = this.cohorts();
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
      const programs = new Set((this.advised() ?? []).map((p) => p.programaId));
      const followed = cohorts.filter((c) => this.programs().some((p) => p.cursoId === c.id && programs.has(p.id)));
      if (followed.length) {
        candidates = followed;
      }
    }
    return (candidates.find((c) => isInTerm(c, term)) ?? candidates[0])?.id ?? '';
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

  readonly search = signal('');
  readonly filter = signal<RowFilter>('all');
  readonly filtering = computed(() => this.search().trim() !== '' || this.filter() !== 'all');

  /** Counted over every cell of the cohort, regardless of the filters. */
  readonly summary = computed(() => {
    const cells = this.grid().rows.flatMap((r) => r.cells);
    const submitted = cells.filter((c) => c.status === 'ENTREGUE' || c.status === 'ENTREGUE_COM_ATRASO');
    return {
      submitted: submitted.length,
      open: cells.filter((c) => c.status === 'PENDENTE').length,
      missed: cells.filter((c) => c.status === 'ATRASADO').length,
      awaiting: submitted.filter((c) => !c.validation).length,
      rejected: submitted.filter((c) => c.validation === 'NAO_VALIDADA').length,
    };
  });

  readonly visibleGrid = computed<StatusGrid>(() => {
    const grid = this.grid();
    const term = this.search().trim().toLocaleLowerCase('pt-BR');
    const keep = (row: ProjectStatusRow): boolean => {
      if (term && !row.project.nome.toLocaleLowerCase('pt-BR').includes(term)) {
        return false;
      }
      const submitted = (s: string) => s === 'ENTREGUE' || s === 'ENTREGUE_COM_ATRASO';
      switch (this.filter()) {
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

  readonly emptyText = computed(() => {
    if (this.grid().rows.length && this.filtering()) {
      return 'Nenhum projeto desta turma corresponde aos filtros.';
    }
    if (!this.programId()) {
      return 'Esta turma ainda não tem programa de PFC. Crie o programa em Gestão de PFC.';
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
