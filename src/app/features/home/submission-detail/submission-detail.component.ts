import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';

import { Activity, Submission, ValidationStatus, validationLabel } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { editedLater } from '../../../core/services/submission-status';
import { SubmissionService } from '../../../core/services/submission.service';
import { action } from '../../../core/state/action';
import { AnswerListComponent } from '../../../shared/components/answer-list/answer-list.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';

// Componente
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

  private readonly downloadAction = action(
    (fieldId: string) => this.submissionService.fileLink(this.projectId(), this.activity().id, fieldId),
    { onSuccess: ({ url }) => window.location.assign(url), concurrency: 'merge' },
  );
  private readonly removeAction = action(() => this.submissionService.remove(this.projectId(), this.activity().id));
  readonly error = computed(() => this.downloadAction.error() || this.removeAction.error());
  readonly removing = this.removeAction.pending;
  readonly deadlinePassed = computed(() => new Date(this.activity().prazo) < new Date());

  private readonly auth = inject(AuthService);
  readonly canValidate = computed(() => this.auth.role() === 'ORIENTADOR');
  protected readonly validationLabel = validationLabel;
  readonly comment = linkedSignal(() => this.submission()?.validacao?.comentario ?? '');
  private readonly targetKey = computed(() => `${this.projectId()}/${this.activity().id}`);
  readonly validationDone = linkedSignal(() => {
    this.targetKey();
    return '';
  });
  private readonly missingComment = linkedSignal(() => {
    this.targetKey();
    return '';
  });
  private readonly validateAction = action(
    (_key: string, status: ValidationStatus, body: { status: ValidationStatus; comentario?: string }) =>
      this.submissionService.validate(this.projectId(), this.activity().id, body),
    {
      onSuccess: (_r, key, status) => {
        if (key === this.targetKey()) {
          this.validationDone.set(status === 'VALIDADA' ? 'Entrega validada.' : 'Entrega marcada como não validada.');
        }
      },
    },
  );
  readonly validating = this.validateAction.pending;
  readonly validationError = computed(() => this.missingComment() || this.validateAction.error());

  // Comentário
  setComment(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  // Validação
  validate(status: ValidationStatus): void {
    const comentario = this.comment().trim();
    if (status === 'NAO_VALIDADA' && !comentario) {
      this.missingComment.set('Para não validar, escreva no comentário o que o grupo precisa corrigir.');
      return;
    }
    this.missingComment.set('');
    this.validationDone.set('');
    this.validateAction.run(this.targetKey(), status, { status, ...(comentario ? { comentario } : {}) });
  }

  // Download
  download(fieldId: string): void {
    this.downloadAction.run(fieldId);
  }

  // Devolução
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
    this.removeAction.run();
  }
}
