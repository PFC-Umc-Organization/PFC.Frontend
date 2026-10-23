import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, model, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Activity, Project, Submission, TimelineItem } from '../../../core/models';
import { SubmissionService } from '../../../core/services/submission.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { AnswerFieldComponent } from '../answer-field/answer-field.component';

@Component({
  selector: 'app-submission-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, DeadlinePipe, AnswerFieldComponent],
  templateUrl: './submission-form.component.html',
  styleUrl: './submission-form.component.scss',
})
export class SubmissionFormComponent {
  private readonly submissionService = inject(SubmissionService);

  readonly project = input.required<Project | null>();
  /** What is still open: not submitted before the deadline, or already submitted. */
  readonly available = input.required<TimelineItem[]>();
  readonly activities = input.required<Activity[]>();
  readonly submissions = input.required<Submission[]>();
  readonly activityId = model('');

  private readonly submission = computed(() => this.submissions().find((s) => s.atividadeId === this.activityId()));
  readonly editing = computed(() => this.submission() !== undefined);
  readonly fields = computed(() => this.activities().find((a) => a.id === this.activityId())?.campos ?? []);

  /** Starts from what was sent whenever another activity is chosen. */
  readonly answers = linkedSignal<Record<string, string | undefined>>(() => ({ ...this.submission()?.respostas }));
  /** Fields uploading right now; a new activity starts with none. */
  private readonly uploading = linkedSignal<Set<string>>(() => {
    this.activityId();
    return new Set();
  });
  readonly sending = signal(false);
  readonly message = signal('');
  readonly error = signal('');

  readonly canSend = computed(() => {
    const answers = this.answers();
    return (
      !!this.activityId() &&
      this.fields().length > 0 &&
      this.fields().every((f) => !f.obrigatorio || !!answers[f.id]?.trim()) &&
      this.uploading().size === 0 &&
      !this.sending()
    );
  });

  choose(event: Event): void {
    this.activityId.set((event.target as HTMLSelectElement).value);
    this.message.set('');
    this.error.set('');
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
    const project = this.project();
    if (!project || !this.canSend()) {
      return;
    }
    const edit = this.editing();
    const answers = Object.fromEntries(
      Object.entries(this.answers()).filter((pair): pair is [string, string] => !!pair[1]),
    );
    this.sending.set(true);
    this.error.set('');
    this.submissionService.submit(this.activityId(), project.id, answers).subscribe({
      next: () => {
        this.sending.set(false);
        this.message.set(edit ? 'Entrega atualizada.' : 'Entrega enviada com sucesso.');
        this.activityId.set('');
      },
      error: (e: Error) => {
        this.sending.set(false);
        this.error.set(e.message);
      },
    });
  }
}
