import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, startWith, switchMap } from 'rxjs';

import { Program, Project, currentTerm, isInTerm } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CohortService } from '../../core/services/cohort.service';
import { ProgramService } from '../../core/services/program.service';
import { ProjectService } from '../../core/services/project.service';

/** State shared by the sections of the management screen; provided by it. */
@Injectable()
export class PfcManagementStore {
  private readonly auth = inject(AuthService);
  private readonly programService = inject(ProgramService);

  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');

  readonly cohorts = toSignal(inject(CohortService).list(), { initialValue: [] });
  private readonly chosenCohort = signal<string | null>(null);

  /** An advisor's projects, to open on a cohort they follow. */
  private readonly advised = toSignal(
    this.isAdmin() ? of([] as Project[]) : inject(ProjectService).list().pipe(catchError(() => of([] as Project[]))),
    { initialValue: [] as Project[] },
  );

  /**
   * The chosen cohort or, at first, one of the current term: for an advisor,
   * the first where they advise a project.
   */
  readonly cohortId = computed(() => {
    const cohorts = this.cohorts();
    const chosen = this.chosenCohort();
    if (chosen && cohorts.some((c) => c.id === chosen)) {
      return chosen;
    }
    const term = currentTerm();
    const advisedPrograms = new Set(this.advised().map((p) => p.programaId));
    const followed = cohorts.filter((c) => this.programs().some((p) => p.cursoId === c.id && advisedPrograms.has(p.id)));
    const candidates = followed.length ? followed : cohorts;
    return (candidates.find((c) => isInTerm(c, term)) ?? candidates[0])?.id ?? '';
  });

  readonly programsError = signal('');
  private readonly reloadPrograms$ = new Subject<void>();
  readonly programs = toSignal(
    this.reloadPrograms$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.programService.list().pipe(
          catchError((e: Error) => {
            this.programsError.set(e.message);
            return of([] as Program[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as Program[] },
  );

  readonly program = computed(() => this.programs().find((p) => p.cursoId === this.cohortId()) ?? null);

  chooseCohort(id: string): void {
    this.chosenCohort.set(id);
  }

  reloadPrograms(): void {
    this.reloadPrograms$.next();
  }
}
