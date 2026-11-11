import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { Activity, NewField } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { action } from '../../../core/state/action';
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
  private readonly saveAction = action(
    (id: string, body: Parameters<ActivityService['update']>[1]) => this.activityService.update(id, body),
    { onSuccess: () => this.closed.emit() },
  );
  private readonly addFieldAction = action((id: string, field: NewField) => this.activityService.addField(id, field), {
    onSuccess: () => this.adder().reset(),
  });
  private readonly removeFieldAction = action((id: string, fieldId: string) => this.activityService.removeField(id, fieldId), {
    concurrency: 'merge',
  });
  readonly error = this.saveAction.error;
  readonly fieldError = computed(() => this.addFieldAction.error() || this.removeFieldAction.error());

  /** Filled once: the list reloads after each field change. */
  ngOnInit(): void {
    const { titulo, prazo, descricao } = this.activity();
    this.form.setValue({ titulo, prazo: prazo.slice(0, 16), descricao });
  }

  addField(field: NewField): void {
    this.addFieldAction.run(this.activity().id, field);
  }

  removeField(index: number): void {
    this.removeFieldAction.run(this.activity().id, this.activity().campos[index].id);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saveAction.run(this.activity().id, this.form.getRawValue());
  }
}
