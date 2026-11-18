import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { Gate } from '../../../core/state/gate';
import { loadable } from '../../../core/state/loadable';
import { retryTransient } from '../../../core/state/retry';
import { EMPTY_GRID, MemberMap } from './staff-home.grid';
import { pickCohortId } from './staff-home.selection';

export const ALL_COHORTS = '__todas__';
const BATCH_LIMIT = 3;

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

  private readonly gate = new Gate(BATCH_LIMIT);

  private readonly isAdvisor = computed(() => this.auth.role() === 'ORIENTADOR');
  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  readonly advisorId = computed(() => (this.isAdvisor() ? (this.auth.user()?.id ?? null) : null));

  readonly cohorts = loadable({ source: () => this.cohortService.list().pipe(retryTransient()), initial: [] as Cohort[] });
  readonly programs = loadable({ source: () => this.programService.list().pipe(retryTransient()), initial: [] as Program[] });
  readonly advised = loadable({
    source: () => this.projectService.list().pipe(retryTransient()),
    params: computed(() => (this.isAdvisor() ? true : null)),
    initial: [] as Project[],
  });

  private readonly chosen = signal<string | null>(inject(ActivatedRoute).snapshot.queryParamMap.get('turma'));
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
    const cohortIds = new Set(this.cohorts.value().map((c) => c.id));
    const advised = this.isAdvisor() ? new Set(this.advised.value().map((p) => p.programaId)) : null;
    return this.programs.value().filter((p) => !!p.id && cohortIds.has(p.cursoId) && (!advised || advised.has(p.id))).map((p) => p.id);
  });
  private readonly scopeParams = computed(() => (this.scopeIds().length ? this.scopeIds() : null));

  readonly gridLoad = loadable({
    source: (ids: string[]) =>
      combineLatest(
        ids.map((programId) => this.gate.run(this.submissionService.statusGrid(programId).pipe(retryTransient(), map((grid) => ({ programId, grid }))))),
      ).pipe(map(mergeScope)),
    params: this.scopeParams,
    initial: EMPTY_SCOPE,
  });
  readonly fullGrid = computed(() => this.gridLoad.value().grid);

  // Visão
  readonly grid = computed(() => {
    const full = this.fullGrid();
    if (this.allCohorts()) {
      return full;
    }
    const programOf = this.gridLoad.value().programOf;
    const programId = this.programId();
    const rows = full.rows.filter((r) => programOf.get(r.project.id) === programId);
    const ids = new Set(rows.map((r) => r.project.id));
    return { ...full, rows, submissions: full.submissions.filter((s) => ids.has(s.projetoId)) };
  });

  readonly userList = loadable({
    source: () => this.userService.list().pipe(retryTransient()),
    initial: [] as User[],
  });
  readonly advisors = computed(() => this.userList.value().filter((u) => isStaff(u.perfil)));
  readonly nameByRgm = computed(() => new Map(this.userList.value().map((u) => [u.rgm, u.nome])));
  readonly nameOf = (rgm: string): string => this.nameByRgm().get(rgm) ?? rgm;

  readonly projectList = loadable({
    source: (ids: string[]) => combineLatest(ids.map((id) => this.gate.run(this.projectService.list(id).pipe(retryTransient())))).pipe(map((lists) => lists.flat())),
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

  // Turma
  readonly cohortIdOf = (projectId: string): string => {
    const programId = this.gridLoad.value().programOf.get(projectId);
    return this.cohortByProgram().get(programId ?? '') ?? '';
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
    const ids = new Set(this.grid().rows.map((r) => r.project.orientadorId));
    return this.advisors().filter((a) => ids.has(a.id));
  });
  readonly scopeAdvisors = computed(() => {
    const ids = new Set(this.fullGrid().rows.map((r) => r.project.orientadorId));
    return this.advisors().filter((a) => ids.has(a.id));
  });

  readonly penaltyList = loadable({
    source: (ids: string[]) => combineLatest(ids.map((id) => this.gate.run(this.penaltyService.ofProgram(id).pipe(retryTransient())))).pipe(map((lists) => lists.flat())),
    params: this.scopeParams,
    initial: [] as ProjectPenalties[],
  });
  readonly penalties = computed(() =>
    this.penaltyList.loading() || this.penaltyList.error()
      ? undefined
      : new Map(this.penaltyList.value().map((p): [string, ProjectPenalties] => [p.projetoId, p])),
  );

  // ---------------------------------------------------------------------------
  // Falhas
  // ---------------------------------------------------------------------------

  private readonly failures = computed(() =>
    [
      { what: 'as turmas', error: this.cohorts.error(), loaded: this.cohorts.value().length > 0 },
      { what: 'os programas de PFC', error: this.programs.error(), loaded: this.programs.value().length > 0 },
      { what: 'os seus projetos', error: this.advised.error(), loaded: this.advised.value().length > 0 },
      { what: 'os projetos da turma', error: this.gridLoad.error(), loaded: this.grid().rows.length > 0 },
      { what: 'os nomes e orientadores', error: this.userList.error() || this.projectList.error(), loaded: this.userList.value().length > 0 || this.projectList.value().length > 0 },
      { what: 'as penalidades', error: this.penaltyList.error(), loaded: this.penaltyList.value().length > 0 },
    ].filter((f) => f.error && !f.loaded),
  );

  readonly loadFailure = computed(() => {
    const failures = this.failures();
    if (!failures.length) {
      return null;
    }
    const names = failures.map((f) => f.what);
    const what = names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : names[0];
    return { what, error: failures[0].error };
  });

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
