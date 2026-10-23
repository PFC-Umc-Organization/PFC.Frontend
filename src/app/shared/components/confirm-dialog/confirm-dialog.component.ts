import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ConfirmationService } from '../../../core/services/confirmation.service';
import { IconComponent } from '../icon/icon.component';

/** The app's confirmation box; see `ConfirmationService`. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  protected readonly service = inject(ConfirmationService);

  answer(confirmed: boolean): void {
    this.service.answer(confirmed);
  }
}
