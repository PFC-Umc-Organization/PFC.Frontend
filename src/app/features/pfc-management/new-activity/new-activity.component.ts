import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { DEFAULT_FIELD, NewField } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ActivityFieldsComponent, activityForm } from '../activity-fields/activity-fields.component';
import { FieldAdderComponent } from '../field-adder/field-adder.component';
import { FieldListComponent } from '../field-list/field-list.component';

@Component({
  selector: 'app-new-activity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, ActivityFieldsComponent, FieldListComponent, FieldAdderComponent],
  templateUrl: './new-activity.component.html',
})
export class NewActivityComponent {
  private readonly activityService = inject(ActivityService);
  private readonly adder = viewChild.required(FieldAdderComponent);

  readonly form = activityForm();
  readonly fields = signal<NewField[]>([{ ...DEFAULT_FIELD }]);
  readonly saving = signal(false);
  readonly published = signal(false);
  readonly error = signal('');

  addField(field: NewField): void {
    this.fields.update((fields) => [...fields, field]);
    this.adder().reset();
  }

  removeField(index: number): void {
    this.fields.update((fields) => (fields.length <= 1 ? fields : fields.filter((_, i) => i !== index)));
  }

  publish(): void {
    this.published.set(false);
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.activityService.create({ ...this.form.getRawValue(), campos: this.fields() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.published.set(true);
        this.form.reset();
        this.fields.set([{ ...DEFAULT_FIELD }]);
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.error.set(e.message);
      },
    });
  }
}
