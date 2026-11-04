import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import {
  Activity,
  STATUS_LABEL,
  Submission,
  SubmissionStatus,
  ValidationStatus,
} from '../../../core/models';
import { SubmissionService } from '../../../core/services/submission.service';
import { AnswerListComponent } from '../../../shared/components/answer-list/answer-list.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';

export interface ActivityGroupItem {
  projectId: string;
  projectName: string;
  status: SubmissionStatus;
  validation?: ValidationStatus;
  submission: Submission | null;
}

/** What every group of the cohort delivered for one activity, opened from the grid's column title. */
@Component({
  selector: 'app-activity-submissions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, AnswerListComponent, DeadlinePipe],
  templateUrl: './activity-submissions.component.html',
  styleUrl: './activity-submissions.component.scss',
})
export class ActivitySubmissionsComponent {
  private readonly submissionService = inject(SubmissionService);

  readonly activity = input.required<Activity>();
  readonly items = input.required<ActivityGroupItem[]>();
  readonly closed = output();
  /** Opens the group's own panel, where the advisor validates and the staff hands back. */
  readonly openGroup = output<{ projectId: string; projectName: string }>();

  protected readonly statusLabel = STATUS_LABEL;
  readonly error = signal('');

  readonly delivered = computed(() => this.items().filter((i) => i.submission).length);

  validationText(v: ValidationStatus | undefined): string {
    if (!v) {
      return 'Aguardando validação';
    }
    return v === 'VALIDADA' ? 'Validada pelo orientador' : 'Não validada pelo orientador';
  }

  download(projectId: string, fieldId: string): void {
    this.error.set('');
    this.submissionService.fileLink(projectId, this.activity().id, fieldId).subscribe({
      next: ({ url }) => window.location.assign(url),
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
