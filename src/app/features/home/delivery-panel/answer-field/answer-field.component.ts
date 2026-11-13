import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { defer, finalize } from 'rxjs';

import { Field, fileNameOf } from '../../../../core/models';
import { ApiError } from '../../../../core/services/http-error';
import { SubmissionService } from '../../../../core/services/submission.service';
import { action } from '../../../../core/state/action';
import { FilePickerComponent } from '../../../../shared/components/file-picker/file-picker.component';

/**
 * One field of the submission form. A file goes straight to the bucket when
 * picked; the submission only changes when the group sends the form. A failed
 * upload leaves the answer as it was: a 503 also comes from an overloaded
 * gateway, and the file would look sent without being so.
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
  /** Registered before the action, so it runs first when the field goes away and no output is emitted after that. */
  private alive = true;
  private readonly onDestroy = inject(DestroyRef).onDestroy(() => (this.alive = false));
  /** Any way an upload ends (done, error, cancelled, replaced, field removed) releases the form's lock. */
  private readonly uploadAction = action(
    (projectId: string, activityId: string, fieldId: string, file: File) =>
      defer(() => {
        this.setProgress(0);
        return this.submissionService.uploadFile(projectId, activityId, fieldId, file);
      }).pipe(finalize(() => this.setProgress(null))),
    {
      onSuccess: (ev) => {
        if (ev.kind === 'progress') {
          this.progress.set(ev.percent);
        } else {
          this.changed.emit(ev.key);
          this.setProgress(null);
        }
      },
      onError: (e) => {
        this.setProgress(null);
        this.error.set(`O arquivo não foi enviado. ${(e as ApiError).message || 'Tente novamente em instantes.'}`);
      },
      concurrency: 'switch',
    },
  );
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
    this.uploadAction.run(this.projectId(), this.activityId(), this.field().id, file);
  }

  private setProgress(value: number | null): void {
    this.progress.set(value);
    if (this.alive) {
      this.uploading.emit(value !== null);
    }
  }
}
