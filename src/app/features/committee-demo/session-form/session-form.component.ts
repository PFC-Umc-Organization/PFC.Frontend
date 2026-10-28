import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Shift } from '../../../core/models';
import { MAX_COMMITTEE } from '../committee-demo.data';
import { CommitteeDemoStore, slotTime } from '../committee-demo.store';

@Component({
  selector: 'app-session-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './session-form.component.html',
  styleUrl: './session-form.component.scss',
})
export class SessionFormComponent {
  protected readonly store = inject(CommitteeDemoStore);
  protected readonly max = MAX_COMMITTEE;

  readonly closed = output();
  readonly created = output<string>();
  readonly error = signal('');

  readonly form = inject(FormBuilder).nonNullable.group({
    date: ['2026-12-09', [Validators.required]],
    shift: ['NOITE' as Shift, [Validators.required]],
    presenterId: [this.store.lastPresenterId(), [Validators.required]],
    start: ['19:15', [Validators.required]],
    minutes: [40, [Validators.required, Validators.min(10)]],
    slots: [4, [Validators.required, Validators.min(1), Validators.max(8)]],
  });
  readonly evaluators = signal<string[]>([]);
  readonly fixed = computed(() => 1 + this.evaluators().length);

  toggle(id: string, checked: boolean): void {
    this.evaluators.update((list) => (checked ? [...list, id] : list.filter((x) => x !== id)));
  }

  /** The times the form will create, so the coordination sees them before saving. */
  preview(): string {
    const v = this.form.getRawValue();
    if (!v.start || !v.minutes || !v.slots) {
      return '';
    }
    const s = { ...v, id: '', evaluatorIds: [] };
    return Array.from({ length: Math.min(v.slots, 8) }, (_, i) => slotTime(s, i)).join(', ');
  }

  save(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Preencha a data, o turno, o apresentador e os horários.');
      return;
    }
    const error = this.store.addSession({ ...this.form.getRawValue(), evaluatorIds: this.evaluators() });
    if (error) {
      this.error.set(error);
      return;
    }
    this.created.emit(this.store.sessions().find((s) => s.date === this.form.getRawValue().date && s.shift === this.form.getRawValue().shift)!.id);
  }
}
