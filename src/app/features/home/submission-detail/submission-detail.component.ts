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

// Componente
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
  // Penalidades
  readonly penalties = input<ProjectPenalties | undefined>(undefined);
  readonly activities = input<Activity[]>([]);
  readonly embedded = input(false);
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
  readonly reopening = linkedSignal(() => {
    this.targetKey();
    this.submission()?.validacao?.status;
    return false;
  });
  readonly validated = computed(() => this.submission()?.validacao?.status === 'VALIDADA');
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
          this.validationDone.set(status === 'VALIDADA' ? 'Entrega validada.' : 'Correção solicitada ao grupo.');
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
  async validate(status: ValidationStatus): Promise<void> {
    const comentario = this.comment().trim();
    if (status === 'NAO_VALIDADA' && !comentario) {
      this.missingComment.set('Para solicitar correção, escreva no comentário o que o grupo precisa corrigir.');
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
            title: 'Solicitar correção',
            message: 'Solicitar correção desta entrega? O envio continua no histórico e o grupo verá o comentário com o que precisa ajustar.',
            confirmText: 'Solicitar correção',
          },
    );
    if (!confirmed) {
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

  // Desfazer
  async handBack(): Promise<void> {
    const after =
      new Date(this.activity().prazo) > new Date()
        ? 'O grupo poderá enviar novamente até o prazo.'
        : 'Como o prazo já encerrou, o grupo não poderá enviar novamente.';
    const confirmed = await this.confirmation.confirm({
      title: 'Desfazer envio',
      message: `Desfazer o envio da atividade "${this.activity().titulo}" do grupo ${this.projectName()}? A submissão atual é apagada do zero: as respostas e os arquivos enviados são removidos e a atividade volta a pendente ou atrasada. ${after} Para pedir ajustes mantendo o histórico, use "Solicitar correção".`,
      confirmText: 'Desfazer envio',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.removeAction.run();
  }
}
