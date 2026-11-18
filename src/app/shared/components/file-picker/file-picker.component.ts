import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { FILE_EXTENSIONS, fileProblem } from '../../../core/models';

// Componente
@Component({
  selector: 'app-file-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './file-picker.component.html',
  styleUrl: './file-picker.component.scss',
})
export class FilePickerComponent {
  readonly inputId = input.required<string>();
  readonly fileName = input<string | null | undefined>(null);
  readonly progress = input<number | null | undefined>(null);
  readonly error = input('');
  readonly extensions = input<readonly string[]>(FILE_EXTENSIONS);
  readonly hint = input('PDF, Office/LibreOffice, imagem, ZIP ou texto, até 50 MB.');
  readonly picked = output<File>();

  protected readonly accept = computed(() => this.extensions().join(','));
  protected readonly problem = signal('');
  readonly busy = computed(() => this.progress() != null);

  // Seleção
  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.problem.set(fileProblem(file, this.extensions()));
    if (!this.problem()) {
      this.picked.emit(file);
    }
  }
}
