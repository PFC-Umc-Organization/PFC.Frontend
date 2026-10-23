import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FIELD_TYPE_LABEL, NewField } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** The submission form of an activity; the last field cannot be removed. */
@Component({
  selector: 'app-field-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './field-list.component.html',
  styleUrl: './field-list.component.scss',
})
export class FieldListComponent {
  readonly fields = input.required<NewField[]>();
  readonly hint = input('');
  readonly remove = output<number>();

  protected readonly typeLabel = FIELD_TYPE_LABEL;
}
