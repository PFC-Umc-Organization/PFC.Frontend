import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

import { FIELD_TYPE_LABEL, FieldType, NewField } from '../../../core/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';

// Componente
@Component({
  selector: 'app-field-adder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './field-adder.component.html',
  styleUrl: './field-adder.component.scss',
})
export class FieldAdderComponent {
  readonly added = output<NewField>();

  protected readonly types = Object.keys(FIELD_TYPE_LABEL) as FieldType[];
  protected readonly typeLabel = FIELD_TYPE_LABEL;

  readonly label = signal('');
  readonly type = signal<FieldType>('TEXTO');
  readonly required = signal(true);

  // Inclusão
  add(): void {
    const rotulo = this.label().trim();
    if (rotulo) {
      this.added.emit({ rotulo, tipo: this.type(), obrigatorio: this.required() });
    }
  }

  // Reset
  reset(): void {
    this.label.set('');
  }
}
