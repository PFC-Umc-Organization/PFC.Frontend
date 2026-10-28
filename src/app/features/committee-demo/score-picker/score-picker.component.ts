import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { SCORES } from '../committee-demo.data';

/** A 0–5 score as a row of buttons: one tap on a phone during the presentation. */
@Component({
  selector: 'app-score-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './score-picker.component.html',
  styleUrl: './score-picker.component.scss',
})
export class ScorePickerComponent {
  readonly label = input.required<string>();
  readonly value = input<number | undefined>(undefined);
  readonly disabled = input(false);
  readonly picked = output<number>();
  protected readonly scores = SCORES;
}
