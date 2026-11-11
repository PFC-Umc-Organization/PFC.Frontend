import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';

import { Invitation } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { InvitationService } from '../../../core/services/invitation.service';
import { action } from '../../../core/state/action';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Invitations the student received; accepting one puts them in that group. */
@Component({
  selector: 'app-received-invitations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent],
  templateUrl: './received-invitations.component.html',
  styleUrl: '../invitations.scss',
})
export class ReceivedInvitationsComponent {
  private readonly invitationService = inject(InvitationService);
  private readonly confirmation = inject(ConfirmationService);

  readonly joined = output();
  private readonly received = loadable({ source: () => this.invitationService.mine(), initial: [] as Invitation[] });
  readonly invitations = this.received.value;
  readonly loadError = this.received.error;

  reload(): void {
    this.received.reload();
  }

  private readonly accepting = signal<string | null>(null);
  private readonly acceptAction = action((projectId: string) => this.invitationService.accept(projectId), {
    onSuccess: () => this.joined.emit(),
    onError: () => this.reload(),
  });
  private readonly declineAction = action((projectId: string) => this.invitationService.decline(projectId), {
    onSuccess: () => this.reload(),
  });
  readonly acceptingId = computed(() => (this.acceptAction.pending() ? this.accepting() : null));
  readonly declining = this.declineAction.pending;
  /** Any answer on the way locks every button: no joining two groups at once. */
  readonly busy = computed(() => this.declining() || this.acceptAction.pending());
  readonly error = computed(() => this.acceptAction.error() || this.declineAction.error());

  accept(invitation: Invitation): void {
    this.accepting.set(invitation.projetoId);
    this.acceptAction.run(invitation.projetoId);
  }

  async decline(invitation: Invitation): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Recusar convite',
      message: `Recusar o convite para o grupo "${invitation.projetoNome}"? Para entrar no grupo depois, será necessário um novo convite.`,
      confirmText: 'Recusar',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.declineAction.run(invitation.projetoId);
  }
}
