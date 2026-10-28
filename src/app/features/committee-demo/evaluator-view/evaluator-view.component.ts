import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CommitteeDemoStore, CommitteeRole, sessionLabel, slotTime } from '../committee-demo.store';
import { EvaluationFormComponent } from '../evaluation-form/evaluation-form.component';

interface Row {
  projectId: string;
  when: string;
  sortKey: string;
  project: string;
  role: CommitteeRole;
  status: string;
  tone: '' | 'ok' | 'warn' | 'bad';
}

/** What a professor sees: only the committees they sit on, each with its sheet. */
@Component({
  selector: 'app-evaluator-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EvaluationFormComponent],
  templateUrl: './evaluator-view.component.html',
  styleUrl: './evaluator-view.component.scss',
})
export class EvaluatorViewComponent {
  protected readonly store = inject(CommitteeDemoStore);

  readonly teacherId = signal('t-ricardo');
  readonly projectId = signal<string | null>('p-rotaverde');
  readonly teacher = computed(() => this.store.teacher(this.teacherId()));

  readonly rows = computed<Row[]>(() =>
    this.store
      .bookings()
      .flatMap((b) => {
        const session = this.store.session(b.sessionId);
        const project = this.store.project(b.projectId);
        const me = this.store.committee(session, project).find((m) => m.teacher.id === this.teacherId());
        if (!me) {
          return [];
        }
        const evaluation = this.store.evaluation(project.id, me.teacher.id);
        const [status, tone]: [string, Row['tone']] =
          b.status === 'AUSENTE'
            ? ['Grupo ausente', 'bad']
            : b.status === 'ENCERRADA'
              ? ['Banca encerrada', 'ok']
              : evaluation?.status === 'ENVIADA'
                ? ['Avaliação enviada', 'ok']
                : evaluation
                  ? ['Rascunho salvo', 'warn']
                  : ['A avaliar', ''];
        return [{
          projectId: project.id,
          when: `${sessionLabel(session)}, ${slotTime(session, b.slot)}`,
          sortKey: `${session.date}${session.shift}${b.slot}`,
          project: project.name,
          role: me.role,
          status,
          tone,
        }];
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
  );

  choose(event: Event): void {
    this.teacherId.set((event.target as HTMLSelectElement).value);
    this.projectId.set(null);
  }

  isAdvisor(projectId: string): boolean {
    return this.store.project(projectId).advisorId === this.teacherId();
  }
}
