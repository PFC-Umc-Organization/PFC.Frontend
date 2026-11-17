import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';

import { Activity, ProjectPenalties, Submission, ValidationStatus, validationLabel } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { editedLater } from '../../../core/services/submission-status';
import { SubmissionService } from '../../../core/services/submission.service';
import { action } from '../../../core/state/action';
import { AnswerListComponent } from '../../../shared/components/answer-list/answer-list.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { CellPenaltiesComponent } from '../cell-penalties/cell-penalties.component';

/**
 * What a group answered for one activity. The staff can hand it back; the
 * project's advisor validates it, which the coordination and the group read.
 */
@Component({
  selector: 'app-submission-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, AnswerListComponent, DeadlinePipe, CellPenaltiesComponent],
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
  /** The group's penalties, undefined while they load or when they failed to; every activity of the grid. */
  readonly penalties = input<ProjectPenalties | undefined>(undefined);
  readonly activities = input<Activity[]>([]);
  readonly closed = output();

  private readonly downloadAction = action(
    (fieldId: string) => this.submissionService.fileLink(this.projectId(), this.activity().id, fieldId),
    { onSuccess: ({ url }) => window.location.assign(url), concurrency: 'merge' },
  );
  private readonly removeAction = action(() => this.submissionService.remove(this.projectId(), this.activity().id));
  readonly error = computed(() => this.downloadAction.error() || this.removeAction.error());
  readonly removing = this.removeAction.pending;
  readonly deadlinePassed = computed(() => new Date(this.activity().prazo) < new Date());

  /** The panel only lists an advisor's own projects, so an advisor here advises this one. */
  private readonly auth = inject(AuthService);
  readonly canValidate = computed(() => this.auth.role() === 'ORIENTADOR');
  protected readonly validationLabel = validationLabel;
  /** Starts from the current comment whenever another cell opens. */
  readonly comment = linkedSignal(() => this.submission()?.validacao?.comentario ?? '');
  /** Group and activity being read; the feedback below belongs to this pair only. */
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

  setComment(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  async validate(status: ValidationStatus): Promise<void> {
    const comentario = this.comment().trim();
    if (status === 'NAO_VALIDADA' && !comentario) {
      this.missingComment.set('Para não validar, escreva no comentário o que o grupo precisa corrigir.');
      return;
    }
    this.missingComment.set('');
    const confirmed = await this.confirmation.confirm(
      status === 'VALIDADA'
        ? {
            title: 'Validar entrega',
            message: 'Validar esta entrega? O grupo verá a validação e o comentário, se houver.',
            confirmText: 'Validar',
          }
        : {
            title: 'Não validar entrega',
            message: 'Marcar esta entrega como não validada? O grupo verá o comentário com o que precisa corrigir.',
            confirmText: 'Não validar',
            danger: true,
          },
    );
    if (!confirmed) {
      return;
    }
    this.missingComment.set('');
    this.validationDone.set('');
    this.validateAction.run(this.targetKey(), status, { status, ...(comentario ? { comentario } : {}) });
  }

  download(fieldId: string): void {
    this.downloadAction.run(fieldId);
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
    this.removeAction.run();
  }
}
