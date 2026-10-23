import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { FILE_EXTENSIONS, fileProblem } from '../../../core/models';

/**
 * Picks one file and checks it against the backend's rules; the parent
 * uploads it and reports progress and errors back.
 */
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
  readonly picked = output<File>();

  protected readonly accept = FILE_EXTENSIONS.join(',');
  protected readonly problem = signal('');
  readonly busy = computed(() => this.progress() != null);

  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.problem.set(fileProblem(file));
    if (!this.problem()) {
      this.picked.emit(file);
    }
  }
}
