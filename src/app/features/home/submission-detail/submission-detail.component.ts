import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { Activity, Submission } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { editedLater } from '../../../core/services/submission-status';
import { SubmissionService } from '../../../core/services/submission.service';
import { AnswerListComponent } from '../../../shared/components/answer-list/answer-list.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';

/** What a group answered for one activity; the staff can hand it back. */
@Component({
  selector: 'app-submission-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, AnswerListComponent, DeadlinePipe],
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
  readonly deadlinePassed = computed(() => new Date(this.activity().prazo) < new Date());

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
        ? 'O grupo poderá enviar novamente até o prazo.'
        : 'Como o prazo já encerrou, o grupo não poderá enviar novamente.';
    const confirmed = await this.confirmation.confirm({
      title: 'Devolver entrega',
      message: `Devolver a entrega ao grupo ${this.projectName()}? As respostas e os arquivos enviados serão apagados. ${after}`,
      confirmText: 'Devolver',
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
