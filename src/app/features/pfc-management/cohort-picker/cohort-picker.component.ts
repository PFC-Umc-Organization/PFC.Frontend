import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { cohortLabel } from '../../../core/models';
import { PfcManagementStore } from '../pfc-management.store';

// Componente
@Component({
  selector: 'app-cohort-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cohort-picker.component.html',
})
export class CohortPickerComponent {
  protected readonly store = inject(PfcManagementStore);
  protected readonly cohortLabel = cohortLabel;

  // Seleção
  choose(event: Event): void {
    this.store.chooseCohort((event.target as HTMLSelectElement).value);
  }
}
