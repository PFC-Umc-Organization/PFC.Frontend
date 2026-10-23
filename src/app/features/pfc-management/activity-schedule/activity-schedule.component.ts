import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { Activity } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';
import { ActivityEditorComponent } from '../activity-editor/activity-editor.component';

@Component({
  selector: 'app-activity-schedule',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, DeadlinePipe, ActivityEditorComponent],
  templateUrl: './activity-schedule.component.html',
  styles: '.alert { margin: 1rem 1.25rem 0; }',
})
export class ActivityScheduleComponent {
  private readonly activityService = inject(ActivityService);
  private readonly confirmation = inject(ConfirmationService);

  readonly loadError = signal('');
  readonly removeError = signal('');
  readonly editingId = signal<string | null>(null);

  readonly activities = toSignal(
    this.activityService.list().pipe(
      catchError((e: Error) => {
        this.loadError.set(e.message);
        return of([] as Activity[]);
      }),
    ),
    { initialValue: [] as Activity[] },
  );

  async remove(id: string, title: string): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Remover atividade',
      message: `Remover a atividade "${title}"? Essa ação não pode ser desfeita.`,
      confirmText: 'Remover',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.removeError.set('');
    this.activityService.remove(id).subscribe({ error: (e: Error) => this.removeError.set(e.message) });
  }
}
