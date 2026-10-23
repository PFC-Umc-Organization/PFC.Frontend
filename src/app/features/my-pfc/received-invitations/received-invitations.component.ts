import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, of, switchMap } from 'rxjs';

import { Invitation } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { InvitationService } from '../../../core/services/invitation.service';
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
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  readonly invitations = toSignal(
    this.reload$.pipe(switchMap(() => this.invitationService.mine().pipe(catchError(() => of([] as Invitation[]))))),
    { initialValue: [] as Invitation[] },
  );

  readonly acceptingId = signal<string | null>(null);
  readonly declining = signal(false);
  /** Any answer on the way locks every button: no joining two groups at once. */
  readonly busy = computed(() => this.declining() || this.acceptingId() !== null);
  readonly error = signal('');

  accept(invitation: Invitation): void {
    this.error.set('');
    this.acceptingId.set(invitation.projetoId);
    this.invitationService.accept(invitation.projetoId).subscribe({
      next: () => {
        this.acceptingId.set(null);
        this.joined.emit();
      },
      error: (e: Error) => {
        this.acceptingId.set(null);
        this.error.set(e.message);
        this.reload$.next();
      },
    });
  }

  async decline(invitation: Invitation): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Recusar convite',
      message: `Recusar o convite para o grupo "${invitation.projetoNome}"? Para entrar depois, alguém do grupo precisa convidar você de novo.`,
      confirmText: 'Recusar',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.error.set('');
    this.declining.set(true);
    this.invitationService.decline(invitation.projetoId).subscribe({
      next: () => {
        this.declining.set(false);
        this.reload$.next();
      },
      error: (e: Error) => {
        this.declining.set(false);
        this.error.set(e.message);
      },
    });
  }
}
