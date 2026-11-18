import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { from } from 'rxjs';

import { cohortLabel } from '../../../core/models';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { ActivitySubmissionsComponent } from '../activity-submissions/activity-submissions.component';
import { CellMenuComponent, CellMenuRef } from '../cell-menu/cell-menu.component';
import { ConsolidatedTableComponent } from '../consolidated-table/consolidated-table.component';
import { KpiStripComponent } from '../kpi-strip/kpi-strip.component';
import { ProjectPanelComponent } from '../project-panel/project-panel.component';
import { CellMenuRequest, CellRef, StatusGridComponent } from '../status-grid/status-grid.component';
import { SubmissionDetailComponent } from '../submission-detail/submission-detail.component';
import { ExportData, exportExcel, exportPdf } from './staff-home.export';
import { PenaltyBand, RowFilter, activityDetailOf, cellDetailOf, indicatorsOf, visibleGridOf } from './staff-home.grid';
import { consolidatedRowsOf, factsOf, kpisOf } from './staff-home.kpis';
import { ALL_COHORTS, StaffHomeStore } from './staff-home.store';

// Tipos
export type { RowFilter } from './staff-home.grid';

type GroupRef = { projectId: string; projectName: string };

// Componente
@Component({
  selector: 'app-staff-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent,
    StatusGridComponent,
    ConsolidatedTableComponent,
    KpiStripComponent,
    CellMenuComponent,
    SubmissionDetailComponent,
    ActivitySubmissionsComponent,
    ProjectPanelComponent,
    DeadlinePipe,
  ],
  providers: [StaffHomeStore],
  templateUrl: './staff-home.component.html',
  styleUrl: './staff-home.component.scss',
})
export class StaffHomeComponent {
  protected readonly store = inject(StaffHomeStore);
  protected readonly cohortLabel = cohortLabel;
  protected readonly allCohorts = ALL_COHORTS;

  // ---------------------------------------------------------------------------
  // Filtros
  // ---------------------------------------------------------------------------

  readonly search = signal('');
  readonly filter = signal<RowFilter>('all');
  readonly advisorFilter = signal('');
  private readonly activeAdvisor = computed(() =>
    this.store.gridAdvisors().some((a) => a.id === this.advisorFilter()) ? this.advisorFilter() : '',
  );
  readonly band = linkedSignal<string, PenaltyBand | null>({ source: this.store.selectedValue, computation: () => null });
  readonly filtering = computed(
    () => this.search().trim() !== '' || this.filter() !== 'all' || this.activeAdvisor() !== '' || this.band() !== null,
  );

  readonly indicators = computed(() => indicatorsOf(this.store.grid(), this.store.penalties()));
  readonly visibleGrid = computed(() =>
    visibleGridOf(this.store.grid(), {
      search: this.search(),
      advisorId: this.activeAdvisor(),
      filter: this.filter(),
      penalties: this.store.penalties(),
      band: this.band(),
      members: this.store.membersByProject(),
    }),
  );

  // ---------------------------------------------------------------------------
  // Indicadores
  // ---------------------------------------------------------------------------

  private readonly facts = computed(() => factsOf(this.store.grid(), this.store.penalties()));
  private readonly kpiGrid = computed(() => {
    const grid = this.store.grid();
    const advisorId = this.store.advisorId();
    return advisorId ? { ...grid, rows: grid.rows.filter((r) => r.project.orientadorId === advisorId) } : grid;
  });
  readonly kpis = computed(() => kpisOf(this.kpiGrid(), factsOf(this.kpiGrid(), this.store.penalties())));
  private readonly visibleFacts = computed(() => {
    const byId = new Map(this.facts().map((f) => [f.projectId, f]));
    return this.visibleGrid().rows.flatMap((r) => byId.get(r.project.id) ?? []);
  });
  readonly consolidated = computed(() =>
    consolidatedRowsOf(this.visibleFacts(), {
      members: this.store.membersByProject(),
      cohortOf: this.store.cohortLabelOf,
      advisorOf: this.store.advisorNameOf,
    }),
  );

  // Busca
  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  // Filtro de situação
  setFilter(event: Event): void {
    this.filter.set((event.target as HTMLSelectElement).value as RowFilter);
  }

  // Filtro de orientador
  setAdvisorFilter(event: Event): void {
    this.advisorFilter.set((event.target as HTMLSelectElement).value);
  }

  // Alternância
  toggleFilter(filter: RowFilter): void {
    this.filter.set(this.filter() === filter ? 'all' : filter);
  }

  readonly emptyText = computed(() => {
    if (this.store.grid().rows.length && this.filtering()) {
      return 'Nenhum projeto desta turma corresponde aos filtros.';
    }
    if (this.store.gridLoad.error()) {
      return 'Os projetos da turma não foram carregados.';
    }
    if (!this.store.scopeIds().length) {
      return this.store.allCohorts()
        ? 'Nenhuma turma tem programa de PFC ainda.'
        : 'Esta turma ainda não tem programa de PFC. Crie o programa em Turmas e PFC.';
    }
    if (this.store.allCohorts()) {
      return this.store.isAdmin() ? 'Nenhum projeto cadastrado nas turmas.' : 'Nenhum projeto das turmas tem você como orientador.';
    }
    return this.store.isAdmin() ? 'Nenhum projeto cadastrado nesta turma.' : 'Nenhum projeto desta turma tem você como orientador.';
  });

  // ---------------------------------------------------------------------------
  // Seleção
  // ---------------------------------------------------------------------------

  readonly selected = signal<CellRef | null>(null);
  readonly selectedActivity = signal<string | null>(null);
  readonly selectedProject = signal<string | null>(null);

  readonly projectDetail = computed(() => this.store.projectById().get(this.selectedProject() ?? '') ?? null);
  readonly activityDetail = computed(() => activityDetailOf(this.visibleGrid(), this.selectedActivity()));
  readonly detail = computed(() => cellDetailOf(this.store.grid(), this.selected()));

  // Fechamento
  private closeAll(): void {
    this.menuCell.set(null);
    this.selected.set(null);
    this.selectedActivity.set(null);
    this.selectedProject.set(null);
  }

  // Abertura de projeto
  openProject(project: { projectId: string }): void {
    const reopen = this.selectedProject() === project.projectId;
    this.closeAll();
    this.selectedProject.set(reopen ? null : project.projectId);
  }

  // Abertura de atividade
  openActivity(activityId: string): void {
    const reopen = this.selectedActivity() === activityId;
    this.closeAll();
    this.selectedActivity.set(reopen ? null : activityId);
  }

  // Abertura de célula
  openCell(cell: CellRef): void {
    this.closeAll();
    this.selected.set(cell);
  }

  openGroupOf(project: GroupRef): void {
    const activityId = this.selectedActivity();
    if (activityId) {
      this.openCell({ ...project, activityId });
    }
  }

  // ---------------------------------------------------------------------------
  // Menu rápido
  // ---------------------------------------------------------------------------

  readonly menuCell = signal<CellMenuRef | null>(null);

  // Abertura
  openMenu({ cell, state, rect }: CellMenuRequest): void {
    this.closeAll();
    const activity = this.store.grid().activities.find((a) => a.id === cell.activityId);
    const penaltyId = this.store
      .penalties()
      ?.get(cell.projectId)
      ?.penalidades.find((p) => p.origem === 'PRAZO' && p.atividadeId === cell.activityId && !p.perdao)?.id;
    this.menuCell.set({
      ...cell,
      state,
      activityTitle: activity?.titulo ?? '',
      deadlinePassed: !!activity && new Date(activity.prazo) < new Date(),
      penaltyId,
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)),
    });
  }

  // Detalhes
  openMenuDetails(): void {
    const cell = this.menuCell();
    this.menuCell.set(null);
    if (cell) {
      this.openCell({ projectId: cell.projectId, projectName: cell.projectName, activityId: cell.activityId });
    }
  }

  // ---------------------------------------------------------------------------
  // Exportação
  // ---------------------------------------------------------------------------

  private readonly exportAction = action((kind: 'xlsx' | 'pdf') => from(kind === 'xlsx' ? exportExcel(this.exportData()) : exportPdf(this.exportData())));
  readonly exporting = this.exportAction.pending;
  readonly exportError = this.exportAction.error;

  private readonly filterLabels: Record<RowFilter, string> = {
    all: 'Todos os projetos',
    failed: 'Reprovados',
    late: 'Com atividade não entregue',
    awaiting: 'Com entrega aguardando validação',
    rejected: 'Com entrega não validada',
    'no-advisor': 'Sem orientador',
  };

  // Filtros ativos
  private readonly filterLines = computed(() => {
    const cohort = this.store.cohorts.value().find((c) => c.id === this.store.cohortId());
    const advisor = this.store.gridAdvisors().find((a) => a.id === this.activeAdvisor());
    const band = this.band();
    return [
      `Turma: ${this.store.allCohorts() ? 'Todas as turmas' : cohort ? cohortLabel(cohort) : '-'}`,
      `Orientador: ${advisor?.nome ?? 'Todos'}`,
      `Situação: ${this.filterLabels[this.filter()]}`,
      `Penalidades ativas: ${band === null ? 'Todas as faixas' : band === 3 ? '3 ou mais' : band}`,
      `Busca: ${this.search().trim() || 'sem busca'}`,
      `Gerado em ${new Date().toLocaleString('pt-BR')}`,
    ];
  });

  private readonly exportData = computed<ExportData>(() => {
    const byId = new Map(this.facts().map((f) => [f.projectId, f]));
    return {
      scope: this.filterLines()[0],
      filters: this.filterLines(),
      kpis: this.kpis(),
      activities: this.store.grid().activities,
      rows: this.consolidated(),
      states: this.consolidated().map((r) => byId.get(r.projectId)?.states ?? []),
    };
  });

  // Exportação
  export(kind: 'xlsx' | 'pdf'): void {
    this.exportAction.run(kind);
  }

  // ---------------------------------------------------------------------------
  // Turma
  // ---------------------------------------------------------------------------

  // Seleção
  chooseCohort(event: Event): void {
    this.store.select((event.target as HTMLSelectElement).value);
  }
}
