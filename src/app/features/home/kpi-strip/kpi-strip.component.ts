import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { PenaltyBand } from '../staff-home/staff-home.grid';
import { Kpis } from '../staff-home/staff-home.kpis';

// Componente
@Component({
  selector: 'app-kpi-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  templateUrl: './kpi-strip.component.html',
  styleUrl: './kpi-strip.component.scss',
})
export class KpiStripComponent {
  readonly kpis = input.required<Kpis>();
  readonly band = input<PenaltyBand | null>(null);
  readonly bandChange = output<PenaltyBand | null>();

  readonly open = signal(false);

  // ---------------------------------------------------------------------------
  // Resumo
  // ---------------------------------------------------------------------------

  readonly summary = computed(() => {
    const { outcome, bands, efficiency } = this.kpis();
    const pct = (value: number | null) => (value === null ? '—' : `${Math.round(value)}%`);
    const active = bands.activeTotal;
    return [
      `Aprovação: ${outcome.known ? pct(outcome.approved.pct) : '—'}`,
      `Eficiência: ${pct(efficiency.completedRate)}`,
      bands.known ? `${active} ${active === 1 ? 'penalidade ativa' : 'penalidades ativas'}` : 'Penalidades: —',
    ].join(' · ');
  });

  protected readonly bandLabel: Record<PenaltyBand, string> = {
    0: 'Nenhuma',
    1: '1 penalidade',
    2: '2 penalidades',
    3: '3 ou mais',
  };

  // Alternância
  toggleBand(band: PenaltyBand): void {
    this.bandChange.emit(this.band() === band ? null : band);
  }
}
