import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { MATERIAL_KIND_LABEL, Material } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';

// Componente
@Component({
  selector: 'app-material-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, DeadlinePipe],
  templateUrl: './material-card.component.html',
  styleUrl: './material-card.component.scss',
})
export class MaterialCardComponent {
  readonly material = input.required<Material>();
  readonly audience = input.required<string>();
  readonly removable = input(false);
  readonly removed = output();
  readonly downloaded = output();

  protected readonly kindLabel = MATERIAL_KIND_LABEL;
}
