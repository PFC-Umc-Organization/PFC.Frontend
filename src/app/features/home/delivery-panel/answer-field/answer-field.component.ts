import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { defer, finalize } from 'rxjs';

import { Field, LINK_FORMATS, LinkFormat, extensionsOf, fileHintOf, fileNameOf, linkProblem } from '../../../../core/models';
import { ApiError } from '../../../../core/services/http-error';
import { SubmissionService } from '../../../../core/services/submission.service';
import { action } from '../../../../core/state/action';
import { FilePickerComponent } from '../../../../shared/components/file-picker/file-picker.component';

// Componente
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

  // ---------------------------------------------------------------------------
  // Formato
  // ---------------------------------------------------------------------------

  readonly extensions = computed(() => extensionsOf(this.field().formato));
  readonly fileHint = computed(() => fileHintOf(this.field().formato));
  private readonly linkRules = computed(() => LINK_FORMATS[(this.field().formato ?? 'GERAL') as LinkFormat] ?? LINK_FORMATS.GERAL);
  readonly placeholder = computed(() => this.linkRules().placeholder);
  readonly linkHint = computed(() => (this.field().formato === 'REPOSITORIO' || this.field().formato === 'VIDEO' ? this.linkRules().hint : ''));
  readonly linkError = computed(() => linkProblem(this.value() ?? '', this.field().formato));

  readonly progress = signal<number | null>(null);
  private alive = true;
  private readonly onDestroy = inject(DestroyRef).onDestroy(() => (this.alive = false));
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

  // Identificação
  get inputId(): string {
    return 'field-' + this.field().id;
  }

  // Digitação
  type(event: Event): void {
    this.changed.emit((event.target as HTMLInputElement | HTMLTextAreaElement).value);
  }

  // Upload
  upload(file: File): void {
    this.error.set('');
    this.uploadAction.run(this.projectId(), this.activityId(), this.field().id, file);
  }

  // Progresso
  private setProgress(value: number | null): void {
    this.progress.set(value);
    if (this.alive) {
      this.uploading.emit(value !== null);
    }
  }
}
