import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';

import { PROJECT_STATUS_LABEL, STATUS_NOTE_LIMIT } from '../../../core/models';
import { StatusChange } from '../consolidated-table/consolidated-table.component';

// Componente
@Component({
  selector: 'app-status-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-dialog.component.html',
  styleUrl: './status-dialog.component.scss',
  host: { '(document:keydown.escape)': 'cancelled.emit()' },
})
export class StatusDialogComponent {
  readonly change = input.required<StatusChange>();
  readonly saving = input(false);
  readonly error = input('');
  readonly confirmed = output<string>();
  readonly cancelled = output();

  protected readonly label = PROJECT_STATUS_LABEL;
  protected readonly limit = STATUS_NOTE_LIMIT;
  protected readonly note = linkedSignal(() => this.change().note ?? '');
  protected readonly needsNote = computed(() => this.change().to === 'APROVADO_COM_RESSALVAS');
  protected readonly canSave = computed(() => !this.saving() && (!this.needsNote() || this.note().trim() !== ''));

  // Texto
  setNote(event: Event): void {
    this.note.set((event.target as HTMLTextAreaElement).value);
  }

  // Confirmação
  save(): void {
    if (this.canSave()) {
      this.confirmed.emit(this.needsNote() ? this.note().trim() : '');
    }
  }
}
