import { Injectable, computed, inject, signal } from '@angular/core';

import { Cohort, Program, Project, currentTerm, isInTerm } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CohortService } from '../../core/services/cohort.service';
import { ProgramService } from '../../core/services/program.service';
import { ProjectService } from '../../core/services/project.service';
import { loadable } from '../../core/state/loadable';

/** State shared by the sections of the management screen; provided by it. */
@Injectable()
export class PfcManagementStore {
  private readonly auth = inject(AuthService);
  private readonly programService = inject(ProgramService);
  private readonly cohortService = inject(CohortService);
  private readonly projectService = inject(ProjectService);

  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');

  readonly cohorts = loadable({ source: () => this.cohortService.list(), initial: [] as Cohort[] });
  private readonly chosenCohort = signal<string | null>(null);

  /** An advisor's projects, to open on a cohort they follow; the coordination does not need them. */
  private readonly advised = loadable({
    source: () => this.projectService.list(),
    params: computed(() => (this.isAdmin() ? null : true)),
    initial: [] as Project[],
  });

  /**
   * The chosen cohort or, at first, one of the current term: for an advisor,
   * the first where they advise a project.
   */
  readonly cohortId = computed(() => {
    const cohorts = this.cohorts.value();
    const chosen = this.chosenCohort();
    if (chosen && cohorts.some((c) => c.id === chosen)) {
      return chosen;
    }
    const term = currentTerm();
    const advisedPrograms = new Set(this.advised.value().map((p) => p.programaId));
    const followed = cohorts.filter((c) => this.programs.value().some((p) => p.cursoId === c.id && advisedPrograms.has(p.id)));
    const candidates = followed.length ? followed : cohorts;
    return (candidates.find((c) => isInTerm(c, term)) ?? candidates[0])?.id ?? '';
  });

  /** A failed create, move or remove; loading has its own error below. */
  readonly programsError = signal('');
  readonly programs = loadable({ source: () => this.programService.list(), initial: [] as Program[] });

  /** Without cohorts, programs or the advisor's projects, an empty list says nothing about the data. */
  readonly loadError = computed(() => this.cohorts.error() || this.programs.error() || this.advised.error());

  retryLoad(): void {
    this.cohorts.reload();
    this.programs.reload();
    this.advised.reload();
  }

  readonly program = computed(() => this.programs.value().find((p) => p.cursoId === this.cohortId()) ?? null);

  chooseCohort(id: string): void {
    this.chosenCohort.set(id);
  }

  reloadPrograms(): void {
    this.programs.reload();
  }
}
