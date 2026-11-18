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
import { action } from '../../../core/state/action';
import { AnswerListComponent } from '../../../shared/components/answer-list/answer-list.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { AnswerFieldComponent } from './answer-field/answer-field.component';

// Tipo
export type DeliveryMode = 'open' | 'submitted' | 'blocked' | 'closed' | 'failed';

// Componente
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
  readonly blockedBy = input('');
  readonly closed = output();

  protected readonly editedLater = editedLater;
  protected readonly validationLabel = validationLabel;

  private readonly activityId = computed(() => this.activity().id);

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
  private readonly sendAction = action(
    (activityId: string, projectId: string, answers: Record<string, string>, _edit: boolean) =>
      this.submissionService.submit(activityId, projectId, answers),
    {
      onSuccess: (_r, _activityId, _projectId, _answers, edit) => {
        this.editing.set(false);
        this.message.set(edit ? 'Entrega atualizada.' : 'Entrega enviada com sucesso.');
        this.showOutcome();
      },
      onError: (e) => {
        this.error.set(e.message);
        this.showOutcome();
      },
    },
  );
  private readonly downloadAction = action(
    (projectId: string, activityId: string, fieldId: string) => this.submissionService.fileLink(projectId, activityId, fieldId),
    { onSuccess: ({ url }) => window.location.assign(url), concurrency: 'merge' },
  );
  readonly downloadError = this.downloadAction.error;
  readonly sending = this.sendAction.pending;

  readonly showForm = computed(() => this.mode() === 'open' || (this.mode() === 'submitted' && this.editing()));
  readonly fields = computed(() => this.activity().campos);

  readonly answers = linkedSignal<Record<string, string | undefined>>(() => ({ ...this.submission()?.respostas }));
  private readonly uploading = linkedSignal<Set<string>>(() => {
    this.activityId();
    this.editing();
    return new Set();
  });
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

  // Edição
  edit(): void {
    this.message.set('');
    this.error.set('');
    this.answers.set({ ...this.submission()?.respostas });
    this.editing.set(true);
  }

  // Cancelamento
  cancelEdit(): void {
    this.editing.set(false);
  }

  // Resposta
  setAnswer(fieldId: string, value: string): void {
    this.message.set('');
    this.answers.update((a) => ({ ...a, [fieldId]: value }));
  }

  // Upload
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

  // Envio
  send(): void {
    if (!this.canSend()) {
      return;
    }
    const edit = this.submission() !== undefined;
    const answers = Object.fromEntries(
      Object.entries(this.answers()).filter((pair): pair is [string, string] => !!pair[1]),
    );
    this.error.set('');
    this.sendAction.run(this.activity().id, this.project().id, answers, edit);
  }

  // Download
  download(fieldId: string): void {
    this.downloadAction.run(this.project().id, this.activity().id, fieldId);
  }

  // Exibição
  private showOutcome(): void {
    queueMicrotask(() => this.outcome()?.nativeElement.scrollIntoView?.({ behavior: 'smooth', block: 'center' }));
  }
}
