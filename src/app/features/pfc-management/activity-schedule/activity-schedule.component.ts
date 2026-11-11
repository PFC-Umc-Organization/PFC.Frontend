import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { Activity } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { ActivityEditorComponent } from '../activity-editor/activity-editor.component';
import { CohortPickerComponent } from '../cohort-picker/cohort-picker.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';
import { PfcManagementStore } from '../pfc-management.store';

@Component({
  selector: 'app-activity-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, DeadlinePipe, ActivityEditorComponent, ScrollHintDirective, CohortPickerComponent],
  templateUrl: './activity-schedule.component.html',
})
export class ActivityScheduleComponent {
  private readonly activityService = inject(ActivityService);
  private readonly store = inject(PfcManagementStore);
  /** Only the coordination creates, edits and deletes activities. */
  protected readonly manage = this.store.isAdmin;
  private readonly confirmation = inject(ConfirmationService);

  readonly removeError = signal('');
  readonly editingId = signal<string | null>(null);
  readonly canAdd = input(true);
  readonly add = output();

  private readonly all = loadable({ source: () => this.activityService.list(), initial: [] as Activity[] });
  readonly loadError = this.all.error;
  readonly loading = this.all.loading;

  reload(): void {
    this.all.reload();
  }

  /** Those of the chosen cohort, and the old ones that apply to every cohort. */
  readonly activities = computed(() => {
    const cohort = this.store.cohortId();
    return this.all.value().filter((a) => !a.turmaId || a.turmaId === cohort);
  });

  async remove(id: string, title: string): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Excluir atividade',
      message: `Excluir a atividade "${title}"? As entregas dos grupos e os arquivos enviados para ela também serão apagados. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.removeError.set('');
    this.activityService.remove(id).subscribe({ error: (e: Error) => this.removeError.set(e.message) });
  }
}
