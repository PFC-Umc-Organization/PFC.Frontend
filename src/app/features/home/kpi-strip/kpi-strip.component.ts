import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal } from '@angular/core';

import { StatusGrid } from '../../../core/services/submission.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PenaltyBand, PenaltyMap } from '../staff-home/staff-home.grid';
import { breakdownOf, factsOf, kpisOf } from '../staff-home/staff-home.kpis';

// Tipo
export interface ClosingOption {
  id: string;
  label: string;
}

// Componente
@Component({
  selector: 'app-kpi-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, IconComponent],
  templateUrl: './kpi-strip.component.html',
  styleUrl: './kpi-strip.component.scss',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class KpiStripComponent {
  readonly grid = input.required<StatusGrid>();
  readonly penalties = input<PenaltyMap>(undefined);
  readonly cohorts = input.required<ClosingOption[]>();
  readonly advisors = input<ClosingOption[]>([]);
  readonly showAdvisor = input(false);
  readonly loading = input(false);
  readonly loadError = input('');
  readonly initialCohort = input('');
  readonly cohortIdOf = input.required<(projectId: string) => string>();
  readonly cohortLabelOf = input.required<(projectId: string) => string>();
  readonly advisorNameOf = input.required<(advisorId: string | undefined) => string>();
  readonly band = input<PenaltyBand | null>(null);
  readonly bandChange = output<PenaltyBand | null>();
  readonly closed = output();

  protected readonly bandLabel: Record<PenaltyBand, string> = {
    0: 'Nenhuma',
    1: '1 penalidade',
    2: '2 penalidades',
    3: '3 ou mais',
  };

  // ---------------------------------------------------------------------------
  // Filtros
  // ---------------------------------------------------------------------------

  readonly cohort = linkedSignal(() => this.initialCohort());
  readonly advisor = signal('');
  readonly filtering = computed(() => this.cohort() !== '' || this.advisor() !== '');

  // Limpeza
  clear(): void {
    this.cohort.set('');
    this.advisor.set('');
  }

  // ---------------------------------------------------------------------------
  // Cálculo
  // ---------------------------------------------------------------------------

  private readonly filtered = computed<StatusGrid>(() => {
    const cohort = this.cohort();
    const advisor = this.advisor();
    const grid = this.grid();
    const cohortOf = this.cohortIdOf();
    const rows = (grid?.rows ?? []).filter(
      (r) => (!cohort || cohortOf?.(r.project.id) === cohort) && (!advisor || r.project.orientadorId === advisor),
    );
    const ids = new Set(rows.map((r) => r.project.id));
    return { activities: grid?.activities ?? [], rows, submissions: (grid?.submissions ?? []).filter((s) => ids.has(s.projetoId)) };
  });
  private readonly facts = computed(() => factsOf(this.filtered(), this.penalties()));
  readonly kpis = computed(() => kpisOf(this.filtered(), this.facts()));
  readonly byCohort = computed(() =>
    breakdownOf(this.filtered(), this.facts(), (f) => this.cohortIdOf()?.(f.projectId) ?? '', (f) => this.cohortLabelOf()?.(f.projectId) ?? '—'),
  );
  readonly byAdvisor = computed(() =>
    breakdownOf(this.filtered(), this.facts(), (f) => f.advisorId ?? '', (f) => this.advisorNameOf()?.(f.advisorId) ?? '—'),
  );

  // ---------------------------------------------------------------------------
  // Comparativo
  // ---------------------------------------------------------------------------

  private readonly chosenTab = signal<'cohort' | 'advisor'>('cohort');
  readonly tab = computed(() => (this.chosenTab() === 'advisor' && this.showAdvisor() ? 'advisor' : 'cohort'));
  readonly rows = computed(() => (this.tab() === 'advisor' ? this.byAdvisor() : this.byCohort()));

  // Aba
  setTab(tab: 'cohort' | 'advisor'): void {
    this.chosenTab.set(tab);
  }

  // Seleção
  setCohort(event: Event): void {
    this.cohort.set((event.target as HTMLSelectElement).value);
  }

  setAdvisor(event: Event): void {
    this.advisor.set((event.target as HTMLSelectElement).value);
  }

  // Faixa
  pickBand(band: PenaltyBand): void {
    this.bandChange.emit(this.band() === band ? null : band);
    this.closed.emit();
  }
}
