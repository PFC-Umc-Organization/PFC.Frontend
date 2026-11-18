import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal } from '@angular/core';

// Tipo
export interface RowMenuItem {
  id: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}

// Componente
@Component({
  selector: 'app-row-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './row-menu.component.html',
  styleUrl: './row-menu.component.scss',
  host: { '(document:keydown.escape)': 'open.set(false)' },
})
export class RowMenuComponent {
  readonly items = input.required<RowMenuItem[]>();
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly chosen = output<string>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly open = signal(false);
  readonly top = signal(0);
  readonly left = signal(0);

  // Alternância
  toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    const rect = this.host.nativeElement.querySelector('button')!.getBoundingClientRect();
    this.top.set(rect.bottom + 4);
    this.left.set(Math.max(8, rect.right - 208));
    this.open.set(true);
  }

  // Escolha
  choose(item: RowMenuItem): void {
    if (item.disabled) {
      return;
    }
    this.open.set(false);
    this.chosen.emit(item.id);
  }
}
