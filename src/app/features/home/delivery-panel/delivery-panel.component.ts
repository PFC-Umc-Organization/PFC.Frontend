import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { Activity, Project, Submission, validationLabel } from '../../../core/models';
import { SubmissionService } from '../../../core/services/submission.service';
import { editedLater } from '../../../core/services/submission-status';
import { AnswerListComponent } from '../../../shared/components/answer-list/answer-list.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { AnswerFieldComponent } from './answer-field/answer-field.component';

/**
 * What the group can do with an activity, as its cell shows it:
 * `open` is the nearest one still to submit, `submitted` can be read and edited,
 * `blocked` waits for an earlier one, `closed` is past the deadline without a
 * submission and `failed` is a group that can no longer submit.
 */
export type DeliveryMode = 'open' | 'submitted' | 'blocked' | 'closed' | 'failed';

/** The group's submission of one activity, below the grid: read it, send it or edit it. */
@Component({
  selector: 'app-delivery-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, DeadlinePipe, AnswerFieldComponent, AnswerListComponent],
  templateUrl: './delivery-panel.component.html',
  styleUrl: './delivery-panel.component.scss',
})
export class DeliveryPanelComponent {
  private readonly submissionService = inject(SubmissionService);

  readonly project = input.required<Project>();
  readonly activity = input.required<Activity>();
  readonly submission = input<Submission | undefined>(undefined);
  readonly mode = input.required<DeliveryMode>();
  /** The title of the activity a blocked one waits for. */
  readonly blockedBy = input('');
  readonly closed = output();

  protected readonly editedLater = editedLater;
  protected readonly validationLabel = validationLabel;

  /** Stable while the grid reloads the same activity, so a reload keeps the message. */
  private readonly activityId = computed(() => this.activity().id);

  /** Each activity starts reading, with nothing said about a past send. */
  readonly editing = linkedSignal(() => {
    this.activityId();
    return false;
  });
  readonly message = linkedSignal(() => {
    this.activityId();
    return '';
  });
  readonly error = linkedSignal(() => {
    this.activityId();
    return '';
  });
  readonly downloadError = signal('');
  readonly sending = signal(false);

  readonly showForm = computed(() => this.mode() === 'open' || (this.mode() === 'submitted' && this.editing()));
  readonly fields = computed(() => this.activity().campos);

  /** Starts from what was sent whenever another activity is chosen. */
  readonly answers = linkedSignal<Record<string, string | undefined>>(() => ({ ...this.submission()?.respostas }));
  /** Fields uploading right now; a new activity starts with none. */
  private readonly uploading = linkedSignal<Set<string>>(() => {
    this.activityId();
    return new Set();
  });
  /** On a phone the button ends a long form: the result is brought into view. */
  private readonly outcome = viewChild<ElementRef<HTMLElement>>('outcome');

  readonly canSend = computed(() => {
    const answers = this.answers();
    return (
      this.fields().length > 0 &&
      this.fields().every((f) => !f.obrigatorio || !!answers[f.id]?.trim()) &&
      this.uploading().size === 0 &&
      !this.sending()
    );
  });

  edit(): void {
    this.message.set('');
    this.error.set('');
    this.answers.set({ ...this.submission()?.respostas });
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  setAnswer(fieldId: string, value: string): void {
    this.message.set('');
    this.answers.update((a) => ({ ...a, [fieldId]: value }));
  }

  setUploading(fieldId: string, busy: boolean): void {
    this.uploading.update((s) => {
      const next = new Set(s);
      if (busy) {
        next.add(fieldId);
      } else {
        next.delete(fieldId);
      }
      return next;
    });
  }

  send(): void {
    if (!this.canSend()) {
      return;
    }
    const edit = this.submission() !== undefined;
    const answers = Object.fromEntries(
      Object.entries(this.answers()).filter((pair): pair is [string, string] => !!pair[1]),
    );
    this.sending.set(true);
    this.error.set('');
    this.submissionService.submit(this.activity().id, this.project().id, answers).subscribe({
      next: () => {
        this.sending.set(false);
        this.editing.set(false);
        this.message.set(edit ? 'Entrega atualizada.' : 'Entrega enviada com sucesso.');
        this.showOutcome();
      },
      error: (e: Error) => {
        this.sending.set(false);
        this.error.set(e.message);
        this.showOutcome();
      },
    });
  }

  download(fieldId: string): void {
    this.downloadError.set('');
    this.submissionService.fileLink(this.project().id, this.activity().id, fieldId).subscribe({
      next: ({ url }) => window.location.assign(url),
      error: (e: Error) => this.downloadError.set(e.message),
    });
  }

  private showOutcome(): void {
    queueMicrotask(() => this.outcome()?.nativeElement.scrollIntoView?.({ behavior: 'smooth', block: 'center' }));
  }
}
