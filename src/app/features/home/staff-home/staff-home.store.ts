import { Injectable, computed, inject, signal } from '@angular/core';
import { combineLatest, map } from 'rxjs';

import { Cohort, Program, Project, ProjectPenalties, User, cohortLabel, currentTerm, isStaff } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CohortService } from '../../../core/services/cohort.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProgramService } from '../../../core/services/program.service';
import { ProjectService } from '../../../core/services/project.service';
import { SubmissionService } from '../../../core/services/submission.service';
import { StatusGrid } from '../../../core/services/submission.service';
import { UserService } from '../../../core/services/user.service';
import { loadable } from '../../../core/state/loadable';
import { EMPTY_GRID, MemberMap } from './staff-home.grid';
import { pickCohortId } from './staff-home.selection';

export const ALL_COHORTS = '__todas__';

// ---------------------------------------------------------------------------
// Consolidação
// ---------------------------------------------------------------------------

interface Scope {
  grid: StatusGrid;
  programOf: ReadonlyMap<string, string>;
}

const EMPTY_SCOPE: Scope = { grid: EMPTY_GRID, programOf: new Map() };

// Junção
function mergeScope(parts: { programId: string; grid: StatusGrid }[]): Scope {
  return {
    grid: {
      activities: parts.find((p) => p.grid.activities.length)?.grid.activities ?? [],
      rows: parts.flatMap((p) => p.grid.rows),
      submissions: parts.flatMap((p) => p.grid.submissions),
    },
    programOf: new Map(parts.flatMap((p) => p.grid.rows.map((r): [string, string] => [r.project.id, p.programId]))),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

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
  readonly advisorId = computed(() => (this.isAdvisor() ? (this.auth.user()?.id ?? null) : null));

  readonly cohorts = loadable({ source: () => this.cohortService.list(), initial: [] as Cohort[] });
  readonly programs = loadable({ source: () => this.programService.list(), initial: [] as Program[] });
  readonly advised = loadable({
    source: () => this.projectService.list(),
    params: computed(() => (this.isAdvisor() ? true : null)),
    initial: [] as Project[],
  });

  private readonly chosen = signal<string | null>(null);
  readonly choosingCohort = computed(() => this.isAdvisor() && this.advised.loading() && !this.chosen());

  readonly allCohorts = computed(() => this.chosen() === ALL_COHORTS);

  readonly cohortId = computed(() => {
    const cohorts = this.cohorts.value();
    const chosen = this.chosen();
    if (this.allCohorts()) {
      return '';
    }
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
  readonly programId = computed(() => this.programByCohort().get(this.cohortId())?.id);
  readonly selectedValue = computed(() => (this.allCohorts() ? ALL_COHORTS : this.cohortId()));

  readonly scopeIds = computed(() => {
    if (!this.allCohorts()) {
      const id = this.programId();
      return id ? [id] : [];
    }
    const cohortIds = new Set(this.cohorts.value().map((c) => c.id));
    const advised = this.isAdvisor() ? new Set(this.advised.value().map((p) => p.programaId)) : null;
    return this.programs.value().filter((p) => cohortIds.has(p.cursoId) && (!advised || advised.has(p.id))).map((p) => p.id);
  });
  private readonly scopeParams = computed(() => (this.scopeIds().length ? this.scopeIds() : null));

  readonly gridLoad = loadable({
    source: (ids: string[]) =>
      combineLatest(ids.map((programId) => this.submissionService.statusGrid(programId).pipe(map((grid) => ({ programId, grid }))))).pipe(map(mergeScope)),
    params: this.scopeParams,
    initial: EMPTY_SCOPE,
  });
  readonly grid = computed(() => this.gridLoad.value().grid);

  readonly userList = loadable({
    source: () => this.userService.list(),
    initial: [] as User[],
  });
  readonly advisors = computed(() => this.userList.value().filter((u) => isStaff(u.perfil)));
  readonly nameByRgm = computed(() => new Map(this.userList.value().map((u) => [u.rgm, u.nome])));
  readonly nameOf = (rgm: string): string => this.nameByRgm().get(rgm) ?? rgm;

  readonly projectList = loadable({
    source: (ids: string[]) => combineLatest(ids.map((id) => this.projectService.list(id))).pipe(map((lists) => lists.flat())),
    params: computed(() => (this.isAdmin() ? this.scopeParams() : null)),
    initial: [] as Project[],
  });
  readonly projects = computed(() => {
    if (this.isAdmin()) {
      return this.projectList.value();
    }
    const ids = new Set(this.scopeIds());
    return this.advised.value().filter((p) => ids.has(p.programaId));
  });
  readonly projectById = computed(() => new Map(this.projects().map((p) => [p.id, p])));

  readonly membersByProject = computed<MemberMap>(
    () => new Map(this.projects().map((p) => [p.id, p.integrantes.map((rgm) => ({ rgm, nome: this.nameOf(rgm) }))])),
  );

  private readonly cohortById = computed(() => new Map(this.cohorts.value().map((c) => [c.id, c])));
  private readonly cohortByProgram = computed(() => new Map(this.programs.value().map((p) => [p.id, p.cursoId])));

  // Turma
  readonly cohortLabelOf = (projectId: string): string => {
    const programId = this.gridLoad.value().programOf.get(projectId);
    const cohort = this.cohortById().get(this.cohortByProgram().get(programId ?? '') ?? '');
    return cohort ? cohortLabel(cohort) : '—';
  };

  // Orientador
  readonly advisorNameOf = (id: string | undefined): string => {
    if (!id) {
      return 'Sem orientador';
    }
    const own = this.auth.user();
    return this.advisors().find((a) => a.id === id)?.nome ?? (own?.id === id ? own.nome : '—');
  };

  readonly gridAdvisors = computed(() => {
    const ids = new Set(this.projects().map((p) => p.orientadorId));
    return this.advisors().filter((a) => ids.has(a.id));
  });

  readonly penaltyList = loadable({
    source: (ids: string[]) => combineLatest(ids.map((id) => this.penaltyService.ofProgram(id))).pipe(map((lists) => lists.flat())),
    params: this.scopeParams,
    initial: [] as ProjectPenalties[],
  });
  readonly penalties = computed(() =>
    this.penaltyList.loading() || this.penaltyList.error()
      ? undefined
      : new Map(this.penaltyList.value().map((p): [string, ProjectPenalties] => [p.projetoId, p])),
  );

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

  // Seleção
  select(cohortId: string): void {
    this.chosen.set(cohortId);
  }

  // Nova tentativa
  retryLoad(): void {
    [this.cohorts, this.programs, this.advised, this.gridLoad, this.userList, this.projectList, this.penaltyList].forEach((l) => l.reload());
  }

  // Recarga
  projectChanged(): void {
    this.gridLoad.reload();
    this.projectList.reload();
  }
}
