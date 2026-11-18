import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PenaltyBand } from '../staff-home/staff-home.grid';
import { Kpis } from '../staff-home/staff-home.kpis';

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
  readonly kpis = input.required<Kpis>();
  readonly band = input<PenaltyBand | null>(null);
  readonly scope = input.required<string>();
  readonly bandChange = output<PenaltyBand | null>();
  readonly closed = output();

  protected readonly bandLabel: Record<PenaltyBand, string> = {
    0: 'Nenhuma',
    1: '1 penalidade',
    2: '2 penalidades',
    3: '3 ou mais',
  };

  // Filtro
  pickBand(band: PenaltyBand): void {
    this.bandChange.emit(this.band() === band ? null : band);
    this.closed.emit();
  }
}
