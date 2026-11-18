import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest, map, of } from 'rxjs';

import { Cohort, Panel, Program, Project, ProjectPenalties, User, cohortLabel, currentTerm, isStaff } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CohortService } from '../../../core/services/cohort.service';
import { PanelService } from '../../../core/services/panel.service';
import { ProgramService } from '../../../core/services/program.service';
import { ProjectService } from '../../../core/services/project.service';
import { StatusGrid } from '../../../core/services/submission.service';
import { buildStatusGrid } from '../../../core/services/submission-status';
import { UserService } from '../../../core/services/user.service';
import { Gate } from '../../../core/state/gate';
import { loadable } from '../../../core/state/loadable';
import { retryTransient } from '../../../core/state/retry';
import { EMPTY_GRID, MemberMap } from './staff-home.grid';
import { pickCohortId } from './staff-home.selection';

export const ALL_COHORTS = '__todas__';
const BATCH_LIMIT = 3;
const SAME_IDS = { equal: (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]) };

// ---------------------------------------------------------------------------
// Consolidação
// ---------------------------------------------------------------------------

interface Scope {
  grid: StatusGrid;
  programOf: ReadonlyMap<string, string>;
}

const EMPTY_SCOPE: Scope = { grid: EMPTY_GRID, programOf: new Map() };

interface ProgramData extends Panel {
  programId: string;
}

// Montagem
function gridOf(data: ProgramData[]): Scope {
  return mergeScope(data.map((d) => ({ programId: d.programId, grid: buildStatusGrid(d.atividades, d.projetos, d.entregas) })));
}

// Leitura
function dataOf(programId: string, panels: PanelService): Observable<ProgramData> {
  return panels.ofProgram(programId).pipe(map((panel) => ({ programId, ...panel })));
}

// Lote
function inBatch<T>(ids: string[], gate: Gate, fetch: (id: string) => Observable<T>): Observable<T[]> {
  return ids.length === 0 ? of([] as T[]) : combineLatest(ids.map((id) => gate.run(fetch(id).pipe(retryTransient()))));
}

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
  private readonly panelService = inject(PanelService);

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

  private readonly allProgramIds = computed<string[]>(() => {
    const cohortIds = new Set(this.cohorts.value().map((c) => c.id));
    const advised = this.isAdvisor() ? new Set(this.advised.value().map((p) => p.programaId)) : null;
    const ids = this.programs.value().filter((p) => !!p.id && cohortIds.has(p.cursoId) && (!advised || advised.has(p.id))).map((p) => p.id);
    return [...new Set(ids)];
  }, SAME_IDS);

  // Escopo
  readonly scopeIds = computed<string[]>(() => {
    if (this.allCohorts()) {
      return this.allProgramIds();
    }
    const id = this.programId();
    return id ? [id] : [];
  }, SAME_IDS);
  private readonly scopeParams = computed(() => (this.scopeIds().length ? this.scopeIds() : null));

  readonly gridLoad = loadable({
    source: (ids: string[]) => inBatch(ids, this.gate, (id) => dataOf(id, this.panelService)),
    params: this.scopeParams,
    initial: [] as ProgramData[],
  });

  // Carregamento
  readonly loading = computed(
    () => this.gridLoad.loading() || this.cohorts.loading() || this.programs.loading() || (this.isAdvisor() && this.advised.loading()),
  );

  private readonly scope = computed(() => gridOf(this.gridLoad.value()));
  readonly grid = computed(() => this.scope().grid);

  // ---------------------------------------------------------------------------
  // Fechamento
  // ---------------------------------------------------------------------------

  private readonly closingWanted = signal(false);

  // Abertura
  wantClosing(): void {
    this.closingWanted.set(true);
  }

  private readonly extraIds = computed<string[]>(() => {
    const loaded = new Set(this.scopeIds());
    return this.closingWanted() ? this.allProgramIds().filter((id) => !loaded.has(id)) : [];
  }, SAME_IDS);
  private readonly extraParams = computed(() => (this.extraIds().length ? this.extraIds() : null));

  private readonly extraData = loadable({
    source: (ids: string[]) => inBatch(ids, this.gate, (id) => dataOf(id, this.panelService)),
    params: this.extraParams,
    initial: [] as ProgramData[],
  });

  readonly closingLoading = computed(() => this.extraData.loading());
  readonly closingError = computed(() => this.extraData.error());

  private readonly fullScope = computed(() => gridOf([...this.gridLoad.value(), ...this.extraData.value()]));
  private readonly programOf = computed(() => this.fullScope().programOf);

  // Junção
  readonly fullGrid = computed(() => this.fullScope().grid);

  readonly userList = loadable({
    source: () => this.userService.list().pipe(retryTransient()),
    initial: [] as User[],
  });
  readonly advisors = computed(() => this.userList.value().filter((u) => isStaff(u.perfil)));
  readonly nameByRgm = computed(() => new Map(this.userList.value().map((u) => [u.rgm, u.nome])));
  readonly nameOf = (rgm: string): string => this.nameByRgm().get(rgm) ?? rgm;

  readonly projects = computed(() => this.gridLoad.value().flatMap((d) => d.projetos));
  readonly projectById = computed(() => new Map(this.projects().map((p) => [p.id, p])));

  readonly membersByProject = computed<MemberMap>(
    () => new Map(this.projects().map((p) => [p.id, p.integrantes.map((rgm) => ({ rgm, nome: this.nameOf(rgm) }))])),
  );

  private readonly cohortById = computed(() => new Map(this.cohorts.value().map((c) => [c.id, c])));
  private readonly cohortByProgram = computed(() => new Map(this.programs.value().map((p) => [p.id, p.cursoId])));

  // Turma
  readonly cohortLabelOf = (projectId: string): string => {
    const programId = this.programOf().get(projectId);
    const cohort = this.cohortById().get(this.cohortByProgram().get(programId ?? '') ?? '');
    return cohort ? cohortLabel(cohort) : '—';
  };

  // Turma
  readonly cohortIdOf = (projectId: string): string => {
    const programId = this.programOf().get(projectId);
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

  readonly penalties = computed(() =>
    this.gridLoad.loading() || this.gridLoad.error()
      ? undefined
      : new Map(this.gridLoad.value().flatMap((d) => d.penalidades).map((p): [string, ProjectPenalties] => [p.projetoId, p])),
  );

  // Completo
  readonly fullPenalties = computed(() => {
    const page = this.penalties();
    if (!page || this.closingLoading() || this.closingError()) {
      return undefined;
    }
    return new Map([...page, ...this.extraData.value().flatMap((d) => d.penalidades).map((p): [string, ProjectPenalties] => [p.projetoId, p])]);
  });

  // ---------------------------------------------------------------------------
  // Falhas
  // ---------------------------------------------------------------------------

  private readonly failures = computed(() =>
    [
      { what: 'as turmas', error: this.cohorts.error(), loaded: this.cohorts.value().length > 0 },
      { what: 'os programas de PFC', error: this.programs.error(), loaded: this.programs.value().length > 0 },
      { what: 'os seus projetos', error: this.advised.error(), loaded: this.advised.value().length > 0 },
      { what: 'os projetos da turma', error: this.gridLoad.error(), loaded: this.grid().rows.length > 0 },
      { what: 'os nomes e orientadores', error: this.userList.error(), loaded: this.userList.value().length > 0 },
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
    [this.cohorts, this.programs, this.advised, this.gridLoad, this.userList].forEach((l) => l.reload());
  }

  // Recarga
  projectChanged(): void {
    this.gridLoad.reload();
  }
}
