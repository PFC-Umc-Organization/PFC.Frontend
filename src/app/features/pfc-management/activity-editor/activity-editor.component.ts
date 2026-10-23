import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { Activity, NewField } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ActivityFieldsComponent, activityForm } from '../activity-fields/activity-fields.component';
import { FieldAdderComponent } from '../field-adder/field-adder.component';
import { FieldListComponent } from '../field-list/field-list.component';

/** Edits an activity in place. Fields are saved one by one, the rest on "Salvar". */
@Component({
  selector: 'app-activity-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, ActivityFieldsComponent, FieldListComponent, FieldAdderComponent],
  templateUrl: './activity-editor.component.html',
  styles: '.editor { padding: 0.5rem 0; } .field-error { margin: 0.5rem 0; font-size: 0.75rem; color: var(--destructive); }',
})
export class ActivityEditorComponent implements OnInit {
  private readonly activityService = inject(ActivityService);
  private readonly adder = viewChild.required(FieldAdderComponent);

  readonly activity = input.required<Activity>();
  readonly closed = output();

  readonly form = activityForm();
  readonly error = signal('');
  readonly fieldError = signal('');

  /** Filled once: the list reloads after each field change. */
  ngOnInit(): void {
    const { titulo, prazo, descricao } = this.activity();
    this.form.setValue({ titulo, prazo: prazo.slice(0, 16), descricao });
  }

  addField(field: NewField): void {
    this.fieldError.set('');
    this.activityService.addField(this.activity().id, field).subscribe({
      next: () => this.adder().reset(),
      error: (e: Error) => this.fieldError.set(e.message),
    });
  }

  removeField(index: number): void {
    this.fieldError.set('');
    this.activityService.removeField(this.activity().id, this.activity().campos[index].id).subscribe({
      error: (e: Error) => this.fieldError.set(e.message),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.activityService.update(this.activity().id, this.form.getRawValue()).subscribe({
      next: () => this.closed.emit(),
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
