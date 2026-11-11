import { Injectable, computed, inject, signal } from '@angular/core';

import { Cohort, Program, Project, ProjectPenalties, User, currentTerm, isStaff } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CohortService } from '../../../core/services/cohort.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProgramService } from '../../../core/services/program.service';
import { ProjectService } from '../../../core/services/project.service';
import { SubmissionService } from '../../../core/services/submission.service';
import { UserService } from '../../../core/services/user.service';
import { loadable } from '../../../core/state/loadable';
import { EMPTY_GRID } from './staff-home.grid';
import { pickCohortId } from './staff-home.selection';

/**
 * What the staff panel reads: cohorts, programs, projects, accounts, the status
 * grid and the penalties of the chosen cohort. A failed read fills its `error`,
 * shown with a retry; none of them lets an empty list pass as "no data". Provided by the screen.
 */
@Injectable()
export class StaffHomeStore {
  private readonly auth = inject(AuthService);
  private readonly cohortService = inject(CohortService);
  private readonly programService = inject(ProgramService);
  private readonly projectService = inject(ProjectService);
  private readonly userService = inject(UserService);
  private readonly penaltyService = inject(PenaltyService);
  private readonly submissionService = inject(SubmissionService);

  private readonly isAdvisor = computed(() => this.auth.role() === 'ORIENTADOR');
  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');

  readonly cohorts = loadable({ source: () => this.cohortService.list(), initial: [] as Cohort[] });
  readonly programs = loadable({ source: () => this.programService.list(), initial: [] as Program[] });
  /** An advisor's projects, to open on a cohort they follow; the coordination does not need them. */
  readonly advised = loadable({
    source: () => this.projectService.list(),
    params: computed(() => (this.isAdvisor() ? true : null)),
    initial: [] as Project[],
  });

  private readonly chosen = signal<string | null>(null);
  readonly choosingCohort = computed(() => this.isAdvisor() && this.advised.loading() && !this.chosen());

  /** The chosen cohort or, at first, the one `pickCohortId` suggests. */
  readonly cohortId = computed(() => {
    const cohorts = this.cohorts.value();
    const chosen = this.chosen();
    if (chosen && cohorts.some((c) => c.id === chosen)) {
      return chosen;
    }
    if (this.choosingCohort()) {
      return '';
    }
    const advisedPrograms = this.isAdvisor() ? new Set(this.advised.value().map((p) => p.programaId)) : null;
    return pickCohortId(cohorts, this.programs.value(), currentTerm(), advisedPrograms);
  });

  private readonly programByCohort = computed(() => new Map(this.programs.value().map((p) => [p.cursoId, p])));
  /** May not exist yet. */
  readonly programId = computed(() => this.programByCohort().get(this.cohortId())?.id);

  readonly gridLoad = loadable({
    source: (programId: string) => this.submissionService.statusGrid(programId),
    params: computed(() => this.programId() ?? null),
    initial: EMPTY_GRID,
  });
  readonly grid = this.gridLoad.value;

  /** The coordination's view: who advises each group, and the data to manage one. */
  readonly userList = loadable({
    source: () => this.userService.list(),
    params: computed(() => (this.isAdmin() ? true : null)),
    initial: [] as User[],
  });
  readonly advisors = computed(() => this.userList.value().filter((u) => isStaff(u.perfil)));
  readonly nameByRgm = computed(() => new Map(this.userList.value().map((u) => [u.rgm, u.nome])));
  readonly nameOf = (rgm: string): string => this.nameByRgm().get(rgm) ?? rgm;

  readonly projectList = loadable({
    source: (programId: string) => this.projectService.list(programId),
    params: computed(() => (this.isAdmin() ? (this.programId() ?? null) : null)),
    initial: [] as Project[],
  });
  readonly projects = this.projectList.value;
  readonly projectById = computed(() => new Map(this.projects().map((p) => [p.id, p])));

  /** Advisors of at least one group of this cohort, for the filter; empty until projects and accounts load. */
  readonly gridAdvisors = computed(() => {
    const ids = new Set(this.projects().map((p) => p.orientadorId));
    return this.advisors().filter((a) => ids.has(a.id));
  });

  readonly penaltyList = loadable({
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
      { what: 'os projetos da turma', error: this.gridLoad.error() },
      { what: 'os nomes e orientadores', error: this.userList.error() || this.projectList.error() },
      { what: 'as penalidades', error: this.penaltyList.error() },
    ].filter((f) => f.error),
  );

  select(cohortId: string): void {
    this.chosen.set(cohortId);
  }

  retryLoad(): void {
    [this.cohorts, this.programs, this.advised, this.gridLoad, this.userList, this.projectList, this.penaltyList].forEach((l) => l.reload());
  }

  /** After editing, assigning an advisor or deleting a group. */
  projectChanged(): void {
    this.gridLoad.reload();
    this.projectList.reload();
  }
}
