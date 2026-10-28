import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { ConfirmationService } from '../../../core/services/confirmation.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CommitteeDemoStore, formatScore, sessionLabel, slotTime } from '../committee-demo.store';

/** One slot of a session: placing a project, or following its committee until it is closed. */
@Component({
  selector: 'app-slot-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './slot-panel.component.html',
  styleUrl: './slot-panel.component.scss',
})
export class SlotPanelComponent {
  protected readonly store = inject(CommitteeDemoStore);
  private readonly confirmation = inject(ConfirmationService);
  protected readonly formatScore = formatScore;

  readonly sessionId = input.required<string>();
  readonly slot = input.required<number>();
  readonly closed = output();

  readonly reason = signal('');
  readonly error = signal('');

  readonly session = computed(() => this.store.session(this.sessionId()));
  readonly heading = computed(() => `${sessionLabel(this.session())} · ${slotTime(this.session(), this.slot())}`);
  readonly booking = computed(() => this.store.bookingAt(this.sessionId(), this.slot()));
  readonly project = computed(() => {
    const b = this.booking();
    return b ? this.store.project(b.projectId) : undefined;
  });
  readonly candidates = computed(() => this.store.candidates(this.sessionId()));
  readonly members = computed(() => {
    const p = this.project();
    if (!p) {
      return [];
    }
    return this.store.committee(this.session(), p).map((m) => ({ ...m, evaluation: this.store.evaluation(p.id, m.teacher.id) }));
  });
  readonly sent = computed(() => this.members().filter((m) => m.evaluation?.status === 'ENVIADA').length);
  readonly anySent = computed(() => this.sent() > 0);
  readonly result = computed(() => (this.project() ? this.store.result(this.project()!.id) : undefined));
  readonly history = computed(() => this.store.log().filter((l) => l.projectId === this.project()?.id));

  advisorName(id: string): string {
    return this.store.teacher(id).name;
  }

  evaluationText(status?: string): string {
    return status === 'ENVIADA' ? 'Avaliação enviada' : status === 'RASCUNHO' ? 'Rascunho salvo' : 'Não iniciada';
  }

  place(projectId: string): void {
    this.store.book(this.sessionId(), this.slot(), projectId);
  }

  private needsReason(): string | null {
    const reason = this.reason().trim();
    if (!reason) {
      this.error.set('Informe o motivo. Ele fica registrado no histórico do grupo.');
      return null;
    }
    this.error.set('');
    this.reason.set('');
    return reason;
  }

  async closeCommittee(): Promise<void> {
    const missing = this.members().length - this.sent();
    if (missing === 0) {
      const ok = await this.confirmation.confirm({
        title: 'Encerrar banca',
        message: `Encerrar a banca de ${this.project()!.name}? A nota final é calculada e o grupo passa a ver o resultado.`,
        confirmText: 'Encerrar banca',
      });
      if (ok) {
        this.store.close(this.project()!.id);
      }
      return;
    }
    const reason = this.needsReason();
    if (reason) {
      this.store.close(this.project()!.id, reason);
    }
  }

  async markAbsent(): Promise<void> {
    const ok = await this.confirmation.confirm({
      title: 'Registrar ausência',
      message: `Registrar que o grupo ${this.project()!.name} não compareceu? O grupo é reprovado. A coordenação pode reverter ou reagendar mediante justificativa.`,
      confirmText: 'Registrar ausência',
      danger: true,
    });
    if (ok) {
      this.store.markAbsent(this.project()!.id);
    }
  }

  revert(): void {
    const reason = this.needsReason();
    if (reason) {
      this.store.revertAbsence(this.project()!.id, reason);
    }
  }

  reschedule(): void {
    const reason = this.needsReason();
    if (reason) {
      this.store.reschedule(this.project()!.id, reason);
    }
  }

  reopen(): void {
    const reason = this.needsReason();
    if (reason) {
      this.store.reopen(this.project()!.id, reason);
    }
  }

  unbook(): void {
    this.store.unbook(this.project()!.id);
  }
}
