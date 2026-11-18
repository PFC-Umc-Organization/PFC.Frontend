import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { from } from 'rxjs';

import { cohortLabel } from '../../../core/models';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { ConsolidatedTableComponent } from '../consolidated-table/consolidated-table.component';
import { KpiStripComponent } from '../kpi-strip/kpi-strip.component';
import { ProjectModalComponent } from '../project-modal/project-modal.component';
import { ActivityTimelineComponent } from '../activity-timeline/activity-timeline.component';
import { ExportData, exportExcel, exportPdf } from './staff-home.export';
import { PenaltyBand, RowFilter, cellDetailOf, indicatorsOf, overviewOf, timelineOf, visibleGridOf } from './staff-home.grid';
import { consolidatedRowsOf, factsOf, kpisOf } from './staff-home.kpis';
import { ALL_COHORTS, StaffHomeStore } from './staff-home.store';

// Tipos
export type { RowFilter } from './staff-home.grid';

// Componente
@Component({
  selector: 'app-staff-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    IconComponent,
    ConsolidatedTableComponent,
    ActivityTimelineComponent,
    KpiStripComponent,
    ProjectModalComponent,
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
  readonly kpisOpen = signal(false);

  // ---------------------------------------------------------------------------
  // Cronograma
  // ---------------------------------------------------------------------------

  private readonly chosenActivity = signal<string | null>(null);
  readonly timeline = computed(() => timelineOf(this.store.grid()));
  readonly activityFilter = computed(() => {
    const id = this.chosenActivity();
    return id && this.store.grid().activities.some((a) => a.id === id) ? id : null;
  });

  // Escolha
  chooseActivity(id: string | null): void {
    this.chosenActivity.set(id);
  }

  // Fechamento
  openClosing(): void {
    this.store.wantClosing();
    this.kpisOpen.set(true);
  }

  readonly bandText = computed(() => (this.band() === 3 ? '3 ou mais' : String(this.band())));
  readonly scopeLabel = computed(() => {
    const cohort = this.store.cohorts.value().find((c) => c.id === this.store.cohortId());
    return this.store.allCohorts() ? 'Todas as turmas' : cohort ? cohortLabel(cohort) : '—';
  });
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
      activityId: this.activityFilter(),
    }),
  );

  // ---------------------------------------------------------------------------
  // Indicadores
  // ---------------------------------------------------------------------------

  private readonly facts = computed(() => factsOf(this.store.grid(), this.store.penalties()));
  readonly modalGrid = computed(() => {
    const grid = this.store.fullGrid();
    const advisorId = this.store.advisorId();
    return advisorId ? { ...grid, rows: grid.rows.filter((r) => r.project.orientadorId === advisorId) } : grid;
  });
  readonly kpis = computed(() => {
    const grid = this.store.advisorId() ? { ...this.store.grid(), rows: this.store.grid().rows.filter((r) => r.project.orientadorId === this.store.advisorId()) } : this.store.grid();
    return kpisOf(grid, factsOf(grid, this.store.penalties()));
  });
  readonly closingCohorts = computed(() => this.store.cohorts.value().map((c) => ({ id: c.id, label: cohortLabel(c) })));
  readonly closingAdvisors = computed(() => this.store.scopeAdvisors().map((a) => ({ id: a.id, label: a.nome })));
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
    if (this.store.allCohorts() ? !this.store.scopeIds().length : !this.store.programId()) {
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

  readonly selectedProject = signal<string | null>(null);
  readonly section = signal<'penalties' | null>(null);
  private readonly chosenDelivery = signal<string | null>(null);

  readonly projectDetail = computed(() => this.store.projectById().get(this.selectedProject() ?? '') ?? null);

  readonly modal = computed(() => {
    const project = this.projectDetail();
    if (!project) {
      return null;
    }
    const deliveries = overviewOf(this.store.grid(), project.id, this.store.penalties());
    const chosen = this.chosenDelivery();
    const activityId =
      deliveries.find((d) => d.activityId === chosen)?.activityId ??
      (deliveries.find((d) => d.state === 'review') ?? deliveries.find((d) => d.state === 'waiting') ?? deliveries[0])?.activityId ??
      null;
    return {
      project,
      cohort: this.store.cohortLabelOf(project.id),
      advisor: this.store.advisorNameOf(project.orientadorId),
      deliveries,
      activityId,
      detail: activityId ? cellDetailOf(this.store.grid(), { projectId: project.id, projectName: project.nome, activityId }) : null,
      penalties: this.store.penalties()?.get(project.id),
    };
  });

  // Abertura
  openProject({ projectId, section, activityId }: { projectId: string; projectName?: string; section?: 'penalties'; activityId?: string }): void {
    this.chosenDelivery.set(activityId ?? null);
    this.section.set(section ?? null);
    this.selectedProject.set(projectId);
  }

  // Entrega
  chooseDelivery(activityId: string): void {
    this.chosenDelivery.set(activityId);
  }

  // Fechamento
  closeProject(): void {
    this.selectedProject.set(null);
    this.section.set(null);
    this.chosenDelivery.set(null);
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
    const advisor = this.store.gridAdvisors().find((a) => a.id === this.activeAdvisor());
    const band = this.band();
    return [
      `Turma: ${this.scopeLabel()}`,
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
