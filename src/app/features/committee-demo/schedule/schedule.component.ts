import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Session } from '../committee-demo.data';
import { CommitteeDemoStore, sessionLabel, slotTime } from '../committee-demo.store';
import { SessionFormComponent } from '../session-form/session-form.component';
import { SlotPanelComponent } from '../slot-panel/slot-panel.component';

interface Slot {
  sessionId: string;
  slot: number;
}

const STATUS_TEXT = { AGENDADA: 'Agendada', AUSENTE: 'Ausente: reprovado', ENCERRADA: 'Encerrada' } as const;

/** The coordination's grid, as in the spreadsheet: one session per date and shift, its slots side by side. */
@Component({
  selector: 'app-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SessionFormComponent, SlotPanelComponent],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent {
  protected readonly store = inject(CommitteeDemoStore);
  protected readonly sessionLabel = sessionLabel;
  protected readonly slotTime = slotTime;
  protected readonly statusText = STATUS_TEXT;

  readonly formOpen = signal(false);
  readonly selected = signal<Slot | null>({ sessionId: 's-1', slot: 1 });

  readonly failedNames = computed(() => this.store.failedProjects.map((p) => p.name).join(', '));

  slots(s: Session): number[] {
    return Array.from({ length: s.slots }, (_, i) => i);
  }

  fixedMembers(s: Session): string {
    return s.evaluatorIds.map((id) => this.store.teacher(id).name).join(', ');
  }

  isEmpty(s: Session): boolean {
    return !this.store.bookings().some((b) => b.sessionId === s.id);
  }

  isSelected(sessionId: string, slot: number): boolean {
    const sel = this.selected();
    return sel?.sessionId === sessionId && sel.slot === slot;
  }

  select(sessionId: string, slot: number): void {
    this.selected.set(this.isSelected(sessionId, slot) ? null : { sessionId, slot });
  }

  /** The panel of the selected slot opens right under its own session. */
  panelFor(s: Session): Slot | null {
    const sel = this.selected();
    return sel?.sessionId === s.id && this.store.sessions().some((x) => x.id === s.id) ? sel : null;
  }

  created(sessionId: string): void {
    this.formOpen.set(false);
    this.selected.set({ sessionId, slot: 0 });
  }
}
