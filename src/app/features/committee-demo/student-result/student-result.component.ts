import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CommitteeDemoStore, formatScore, sessionLabel, slotTime } from '../committee-demo.store';

/** What a student sees on their home page: when the group presents and, once closed, the grade. */
@Component({
  selector: 'app-student-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-result.component.html',
  styleUrl: './student-result.component.scss',
})
export class StudentResultComponent {
  protected readonly store = inject(CommitteeDemoStore);
  protected readonly formatScore = formatScore;

  readonly rgm = signal('11230000101');

  readonly project = computed(() => this.store.projects.find((p) => p.members.some((m) => m.rgm === this.rgm()))!);
  readonly student = computed(() => this.project().members.find((m) => m.rgm === this.rgm())!);
  readonly booking = computed(() => this.store.bookingOf(this.project().id));
  readonly when = computed(() => {
    const b = this.booking();
    if (!b) {
      return '';
    }
    const s = this.store.session(b.sessionId);
    return `${sessionLabel(s)}, às ${slotTime(s, b.slot)}`;
  });
  readonly committeeNames = computed(() =>
    this.store
      .committeeOf(this.project().id)
      .map((m) => m.teacher.name)
      .join(', '),
  );
  readonly result = computed(() => this.store.result(this.project().id));
  readonly mine = computed(() => this.result().students.find((s) => s.rgm === this.rgm())!);

  choose(event: Event): void {
    this.rgm.set((event.target as HTMLSelectElement).value);
  }
}
