import { ChangeDetectionStrategy, Component, OnInit, inject, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { concat, last } from 'rxjs';

import { Activity, ActivityUpdate, NewField } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ActivityFieldsComponent, activityForm } from '../activity-fields/activity-fields.component';
import { FieldAdderComponent } from '../field-adder/field-adder.component';
import { FieldListComponent } from '../field-list/field-list.component';

// Rascunho
type DraftField = NewField & { id?: string };

// Edição
@Component({
  selector: 'app-activity-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, ActivityFieldsComponent, FieldListComponent, FieldAdderComponent],
  templateUrl: './activity-editor.component.html',
  styles: '.editor { padding: 0.5rem 0; }',
})
export class ActivityEditorComponent implements OnInit {
  private readonly activityService = inject(ActivityService);
  private readonly adder = viewChild.required(FieldAdderComponent);
  private readonly confirmation = inject(ConfirmationService);

  readonly activity = input.required<Activity>();
  readonly closed = output();

  readonly form = activityForm();
  readonly fields = linkedSignal<DraftField[]>(() => this.activity().campos.map((c) => ({ ...c })));
  private readonly partial = signal(false);

  // New fields first: the backend refuses to remove an activity's last field,
  // so swapping every field only works in this order.
  private readonly saveAction = action(
    (id: string, body: ActivityUpdate, added: NewField[], removed: string[]) =>
      concat(
        ...added.map((field) => this.activityService.addField(id, field)),
        ...removed.map((fieldId) => this.activityService.removeField(id, fieldId)),
        this.activityService.update(id, body),
      ).pipe(last()),
    {
      onSuccess: () => this.closed.emit(),
      onError: (_e, _id, _body, added, removed) => this.partial.set(added.length + removed.length > 0),
    },
  );
  readonly saving = this.saveAction.pending;
  readonly error = this.saveAction.error;
  readonly partialSave = this.partial.asReadonly();

  // Inicialização
  ngOnInit(): void {
    const { titulo, prazo, descricao } = this.activity();
    this.form.setValue({ titulo, prazo: prazo.slice(0, 16), descricao });
  }

  addField(field: NewField): void {
    this.fields.update((fields) => [...fields, field]);
    this.adder().reset();
  }

  removeField(index: number): void {
    this.fields.update((fields) => (fields.length <= 1 ? fields : fields.filter((_, i) => i !== index)));
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const draft = this.fields();
    const kept = new Set(draft.map((f) => f.id).filter(Boolean));
    const removed = this.activity().campos.filter((c) => !kept.has(c.id)).map((c) => c.id);
    const added = draft.filter((f) => !f.id).map(({ rotulo, tipo, obrigatorio }) => ({ rotulo, tipo, obrigatorio }));
    const changes = added.length + removed.length;
    const confirmed = await this.confirmation.confirm({
      title: 'Salvar atividade',
      message:
        `Salvar as alterações da atividade "${this.form.controls.titulo.value.trim()}"?` +
        (changes ? ` ${added.length} campo(s) adicionado(s) e ${removed.length} removido(s).` : ''),
      confirmText: 'Salvar',
    });
    if (!confirmed) {
      return;
    }
    this.partial.set(false);
    this.saveAction.run(this.activity().id, this.form.getRawValue(), added, removed);
  }
}
