import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Activity, Submission, fileNameOf, isStoredFile } from '../../../core/models';
import { IconComponent } from '../icon/icon.component';

/** A submission's answers next to each field's label; stored files can be downloaded. */
@Component({
  selector: 'app-answer-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './answer-list.component.html',
  styleUrl: './answer-list.component.scss',
})
export class AnswerListComponent {
  readonly activity = input.required<Activity>();
  readonly submission = input.required<Submission>();
  readonly download = output<string>();

  protected readonly isStoredFile = isStoredFile;
  protected readonly fileNameOf = fileNameOf;

  readonly rows = computed(() =>
    this.activity().campos.map((f) => ({
      fieldId: f.id,
      label: f.rotulo,
      type: f.tipo,
      value: this.submission().respostas?.[f.id] ?? '',
    })),
  );
}
