import { ChangeDetectionStrategy, Component, computed, linkedSignal, output, signal } from '@angular/core';

import { FIELD_TYPE_LABEL, FieldType, FormatOption, NewField, fileFormatOptions, linkFormatOptions } from '../../../core/models';
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

  // ---------------------------------------------------------------------------
  // Formato
  // ---------------------------------------------------------------------------

  readonly formats = computed<FormatOption[]>(() => {
    switch (this.type()) {
      case 'ARQUIVO':
        return fileFormatOptions;
      case 'LINK':
        return linkFormatOptions;
      default:
        return [];
    }
  });
  readonly formatLabel = computed(() => (this.type() === 'ARQUIVO' ? 'Formato aceito' : 'Tipo de link'));
  readonly format = linkedSignal(() => {
    this.type();
    return 'GERAL';
  });

  // Inclusão
  add(): void {
    const rotulo = this.label().trim();
    if (rotulo) {
      const formato = this.formats().length && this.format() !== 'GERAL' ? this.format() : undefined;
      this.added.emit({ rotulo, tipo: this.type(), obrigatorio: this.required(), ...(formato ? { formato } : {}) });
    }
  }

  // Reset
  reset(): void {
    this.label.set('');
    this.format.set('GERAL');
  }
}
