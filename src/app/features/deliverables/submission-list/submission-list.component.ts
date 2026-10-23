import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Activity, Submission } from '../../../core/models';
import { editedLater } from '../../../core/services/submission-status';
import { AnswerListComponent } from '../../../shared/components/answer-list/answer-list.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

export interface SentSubmission {
  activity: Activity;
  submission: Submission;
}

@Component({
  selector: 'app-submission-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IconComponent, AnswerListComponent],
  templateUrl: './submission-list.component.html',
  styleUrl: './submission-list.component.scss',
})
export class SubmissionListComponent {
  protected readonly editedLater = editedLater;

  readonly items = input.required<SentSubmission[]>();
  readonly error = input('');
  readonly editable = input(true);
  readonly edit = output<string>();
  readonly download = output<{ activityId: string; fieldId: string }>();
}
