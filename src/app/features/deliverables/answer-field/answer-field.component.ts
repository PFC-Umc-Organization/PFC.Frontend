import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { Field, fileNameOf } from '../../../core/models';
import { ApiError } from '../../../core/services/http-error';
import { SubmissionService } from '../../../core/services/submission.service';
import { FilePickerComponent } from '../../../shared/components/file-picker/file-picker.component';

/**
 * One field of the submission form. A file goes straight to the bucket when
 * picked; the submission only changes when the group sends the form. Without
 * a bucket in the backend (503), the answer is just the file name.
 */
@Component({
  selector: 'app-answer-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilePickerComponent],
  host: { class: 'field' },
  templateUrl: './answer-field.component.html',
  styles: '.optional { font-weight: 400; color: var(--muted-foreground); }',
})
export class AnswerFieldComponent {
  private readonly submissionService = inject(SubmissionService);

  readonly field = input.required<Field>();
  readonly value = input<string | undefined>('');
  readonly projectId = input.required<string>();
  readonly activityId = input.required<string>();
  readonly changed = output<string>();
  readonly uploading = output<boolean>();

  readonly progress = signal<number | null>(null);
  readonly error = signal('');
  protected readonly fileNameOf = fileNameOf;

  get inputId(): string {
    return 'field-' + this.field().id;
  }

  type(event: Event): void {
    this.changed.emit((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  upload(file: File): void {
    this.error.set('');
    this.setProgress(0);
    this.submissionService.uploadFile(this.projectId(), this.activityId(), this.field().id, file).subscribe({
      next: (ev) => {
        if (ev.kind === 'progress') {
          this.progress.set(ev.percent);
        } else {
          this.changed.emit(ev.key);
          this.setProgress(null);
        }
      },
      error: (e: ApiError) => {
        this.setProgress(null);
        if (e.status === 503) {
          this.changed.emit(file.name);
        } else {
          this.error.set(e.message);
        }
      },
    });
  }

  private setProgress(value: number | null): void {
    this.progress.set(value);
    this.uploading.emit(value !== null);
  }
}
