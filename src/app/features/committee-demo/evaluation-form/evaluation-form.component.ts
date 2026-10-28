import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';

import { ConfirmationService } from '../../../core/services/confirmation.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Evaluation } from '../committee-demo.data';
import { CommitteeDemoStore, sessionLabel, slotTime } from '../committee-demo.store';
import { ScorePickerComponent } from '../score-picker/score-picker.component';

/** The evaluation sheet of one professor for one project: everything the group delivered, then the scores. */
@Component({
  selector: 'app-evaluation-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ScorePickerComponent],
  templateUrl: './evaluation-form.component.html',
  styleUrl: './evaluation-form.component.scss',
})
export class EvaluationFormComponent {
  protected readonly store = inject(CommitteeDemoStore);
  private readonly confirmation = inject(ConfirmationService);

  readonly projectId = input.required<string>();
  readonly teacherId = input.required<string>();
  readonly closed = output();

  readonly project = computed(() => this.store.project(this.projectId()));
  readonly booking = computed(() => this.store.bookingOf(this.projectId())!);
  readonly when = computed(() => {
    const s = this.store.session(this.booking().sessionId);
    return `${sessionLabel(s)}, ${slotTime(s, this.booking().slot)}`;
  });
  readonly committeeNames = computed(() =>
    this.store
      .committeeOf(this.projectId())
      .map((m) => m.teacher.name)
      .join(', '),
  );

  /** The sheet being filled; starts from what was saved. */
  readonly draft = linkedSignal<Evaluation>(() => {
    const saved = this.store.evaluation(this.projectId(), this.teacherId());
    return saved
      ? structuredClone(saved)
      : { projectId: this.projectId(), teacherId: this.teacherId(), status: 'RASCUNHO', group: {}, individual: {}, comment: '' };
  });
  readonly message = signal('');
  readonly error = signal('');

  readonly locked = computed(() => this.draft().status === 'ENVIADA' || this.booking().status !== 'AGENDADA');
  readonly lockText = computed(() => {
    switch (this.booking().status) {
      case 'ENCERRADA':
        return 'A banca foi encerrada. Só a coordenação pode reabri-la.';
      case 'AUSENTE':
        return 'O grupo não compareceu. Não há avaliação a fazer.';
      default:
        return this.draft().status === 'ENVIADA' ? 'Avaliação enviada. Ela não pode mais ser alterada.' : '';
    }
  });

  readonly sections = computed(() => {
    const groups = new Map<string, typeof this.store.groupCriteria>();
    for (const c of this.store.groupCriteria) {
      groups.set(c.section, [...(groups.get(c.section) ?? []), c]);
    }
    return [...groups.entries()].map(([title, criteria]) => ({ title, criteria }));
  });

  readonly missing = computed(() => {
    const d = this.draft();
    const group = this.store.groupCriteria.filter((c) => d.group[c.id] === undefined).length;
    const individual = this.project().members.reduce(
      (n, m) => n + this.store.individualCriteria.filter((c) => d.individual[m.rgm]?.[c.id] === undefined).length,
      0,
    );
    return group + individual;
  });

  setGroup(criterionId: string, score: number): void {
    this.message.set('');
    this.error.set('');
    this.draft.update((d) => ({ ...d, group: { ...d.group, [criterionId]: score } }));
  }

  setIndividual(rgm: string, criterionId: string, score: number): void {
    this.message.set('');
    this.error.set('');
    this.draft.update((d) => ({ ...d, individual: { ...d.individual, [rgm]: { ...d.individual[rgm], [criterionId]: score } } }));
  }

  setComment(text: string): void {
    this.draft.update((d) => ({ ...d, comment: text }));
  }

  saveDraft(): void {
    this.error.set('');
    this.store.saveEvaluation({ ...this.draft(), status: 'RASCUNHO' });
    this.message.set('Rascunho salvo. Você pode continuar depois.');
  }

  async send(): Promise<void> {
    this.message.set('');
    if (this.missing() > 0) {
      this.error.set(`Faltam ${this.missing()} ${this.missing() === 1 ? 'nota' : 'notas'} para enviar a avaliação.`);
      return;
    }
    this.error.set('');
    const ok = await this.confirmation.confirm({
      title: 'Enviar avaliação',
      message: `Enviar a avaliação de ${this.project().name}? Depois de enviada, ela não pode mais ser alterada.`,
      confirmText: 'Enviar avaliação',
    });
    if (ok) {
      this.store.saveEvaluation({ ...this.draft(), status: 'ENVIADA', sentAt: new Date().toISOString() });
    }
  }

  isLink(text?: string): boolean {
    return !!text?.startsWith('https://');
  }
}
