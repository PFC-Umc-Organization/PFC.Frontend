import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { Activity, Submission } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { editedLater } from '../../../core/services/submission-status';
import { SubmissionService } from '../../../core/services/submission.service';
import { AnswerListComponent } from '../../../shared/components/answer-list/answer-list.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** What a group answered for one activity; the staff can hand it back. */
@Component({
  selector: 'app-submission-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, AnswerListComponent],
  templateUrl: './submission-detail.component.html',
  styleUrl: './submission-detail.component.scss',
})
export class SubmissionDetailComponent {
  protected readonly editedLater = editedLater;

  private readonly submissionService = inject(SubmissionService);
  private readonly confirmation = inject(ConfirmationService);

  readonly projectId = input.required<string>();
  readonly projectName = input.required<string>();
  readonly activity = input.required<Activity>();
  readonly submission = input<Submission | null>(null);
  readonly closed = output();

  readonly error = signal('');

  download(fieldId: string): void {
    this.error.set('');
    this.submissionService.fileLink(this.projectId(), this.activity().id, fieldId).subscribe({
      next: ({ url }) => window.location.assign(url),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  async handBack(): Promise<void> {
    const after =
      new Date(this.activity().prazo) > new Date()
        ? 'O grupo poderá entregar de novo até o prazo.'
        : 'O prazo já acabou: o grupo não poderá entregar de novo.';
    const confirmed = await this.confirmation.confirm({
      title: 'Remover entrega',
      message: `Remover a entrega do projeto "${this.projectName()}"? ${after}`,
      confirmText: 'Remover',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.error.set('');
    this.submissionService.remove(this.projectId(), this.activity().id).subscribe({
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
