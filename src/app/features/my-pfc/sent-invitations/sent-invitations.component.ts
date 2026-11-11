import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { Invitation } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { InvitationService } from '../../../core/services/invitation.service';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** The group's invitations nobody answered yet, and the form to send more. */
@Component({
  selector: 'app-sent-invitations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, IconComponent],
  templateUrl: './sent-invitations.component.html',
  styleUrls: ['../invitations.scss', './sent-invitations.component.scss'],
})
export class SentInvitationsComponent {
  private readonly invitationService = inject(InvitationService);
  private readonly confirmation = inject(ConfirmationService);

  readonly projectId = input.required<string>();
  private readonly sent = loadable({
    source: (id: string) => this.invitationService.ofProject(id),
    params: computed(() => this.projectId() || null),
    initial: [] as Invitation[],
  });
  readonly pending = this.sent.value;
  readonly loadError = this.sent.error;
  readonly loading = this.sent.loading;

  reload(): void {
    this.sent.reload();
  }

  readonly form = new FormGroup({ rgm: new FormControl('', { nonNullable: true }) });
  /** Any request on the way locks every button: no double clicks. */
  readonly busy = signal(false);
  readonly inviting = signal(false);
  readonly error = signal('');

  invite(): void {
    const rgm = this.form.controls.rgm.value.trim();
    this.error.set('');
    if (!rgm) {
      this.error.set('Informe o RGM do colega.');
      return;
    }
    this.busy.set(true);
    this.inviting.set(true);
    this.invitationService.invite(this.projectId(), rgm).subscribe({
      next: () => {
        this.busy.set(false);
        this.inviting.set(false);
        this.form.reset();
        this.reload();
      },
      error: (e: Error) => {
        this.busy.set(false);
        this.inviting.set(false);
        this.error.set(e.message);
      },
    });
  }

  async cancel(invitation: Invitation): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Cancelar convite',
      message: `Cancelar o convite de ${invitation.nome ? `${invitation.nome} (RGM ${invitation.rgm})` : `RGM ${invitation.rgm}`}? O convite deixará de ser exibido para o colega.`,
      confirmText: 'Cancelar convite',
      cancelText: 'Voltar',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.error.set('');
    this.busy.set(true);
    this.invitationService.cancel(this.projectId(), invitation.rgm).subscribe({
      next: () => {
        this.busy.set(false);
        this.reload();
      },
      error: (e: Error) => {
        this.busy.set(false);
        this.error.set(e.message);
      },
    });
  }
}
