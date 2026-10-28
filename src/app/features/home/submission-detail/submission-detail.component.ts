import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';

import { Activity, Submission, ValidationStatus, validationLabel } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { editedLater } from '../../../core/services/submission-status';
import { SubmissionService } from '../../../core/services/submission.service';
import { AnswerListComponent } from '../../../shared/components/answer-list/answer-list.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';

/**
 * What a group answered for one activity. The staff can hand it back; the
 * project's advisor validates it, which the coordination and the group read.
 */
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

  /** The panel only lists an advisor's own projects, so an advisor here advises this one. */
  private readonly auth = inject(AuthService);
  readonly canValidate = computed(() => this.auth.role() === 'ORIENTADOR');
  protected readonly validationLabel = validationLabel;
  /** Starts from the current comment whenever another cell opens. */
  readonly comment = linkedSignal(() => this.submission()?.validacao?.comentario ?? '');
  readonly validating = signal(false);
  readonly validationError = signal('');
  readonly validationDone = signal('');

  setComment(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  validate(status: ValidationStatus): void {
    const comentario = this.comment().trim();
    if (status === 'NAO_VALIDADA' && !comentario) {
      this.validationError.set('Para não validar, escreva no comentário o que o grupo precisa corrigir.');
      return;
    }
    this.validationError.set('');
    this.validationDone.set('');
    this.validating.set(true);
    this.submissionService
      .validate(this.projectId(), this.activity().id, { status, ...(comentario ? { comentario } : {}) })
      .subscribe({
        next: () => {
          this.validating.set(false);
          this.validationDone.set(status === 'VALIDADA' ? 'Entrega validada.' : 'Entrega marcada como não validada.');
        },
        error: (e: Error) => {
          this.validating.set(false);
          this.validationError.set(e.message);
        },
      });
  }

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
