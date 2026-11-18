import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { Activity } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { action } from '../../../core/state/action';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { ActivityEditorComponent } from '../activity-editor/activity-editor.component';
import { CohortPickerComponent } from '../cohort-picker/cohort-picker.component';
import { PfcManagementStore } from '../pfc-management.store';

// Tipo
type ScheduleStatus = 'past' | 'next' | 'future';

// Componente
@Component({
  selector: 'app-activity-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, DeadlinePipe, ActivityEditorComponent, CohortPickerComponent],
  templateUrl: './activity-schedule.component.html',
  styleUrl: './activity-schedule.component.scss',
})
export class ActivityScheduleComponent {
  private readonly activityService = inject(ActivityService);
  private readonly store = inject(PfcManagementStore);
  protected readonly manage = this.store.isAdmin;
  private readonly confirmation = inject(ConfirmationService);

  private readonly removeAction = action((id: string) => this.activityService.remove(id), { concurrency: 'merge' });
  readonly removeError = this.removeAction.error;
  readonly editingId = signal<string | null>(null);
  readonly canAdd = input(true);
  readonly add = output();

  private readonly all = loadable({ source: () => this.activityService.list(), initial: [] as Activity[] });
  readonly loadError = this.all.error;
  readonly loading = this.all.loading;

  // Recarga
  reload(): void {
    this.all.reload();
  }

  readonly activities = computed(() => {
    const cohort = this.store.cohortId();
    return this.all.value().filter((a) => !a.turmaId || a.turmaId === cohort);
  });

  // ---------------------------------------------------------------------------
  // Cronograma
  // ---------------------------------------------------------------------------

  readonly cards = computed(() => {
    const now = Date.now();
    const sorted = [...this.activities()].sort((a, b) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime());
    const nextId = sorted.find((a) => new Date(a.prazo).getTime() >= now)?.id;
    return sorted.map((activity) => ({
      activity,
      status: (new Date(activity.prazo).getTime() < now ? 'past' : activity.id === nextId ? 'next' : 'future') as ScheduleStatus,
      fields: activity.campos.length,
    }));
  });

  readonly summary = computed(() => {
    const cards = this.cards();
    const count = (status: ScheduleStatus) => cards.filter((c) => c.status === status).length;
    return { past: count('past'), next: cards.find((c) => c.status === 'next')?.activity.titulo ?? null, future: count('future') };
  });

  protected readonly statusLabel: Record<ScheduleStatus, string> = { past: 'Vencida', next: 'Próxima', future: 'Futura' };

  // Seleção
  select(id: string): void {
    if (this.manage()) {
      this.editingId.set(id);
    }
  }

  // Exclusão
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
    this.removeAction.run(id);
  }
}
