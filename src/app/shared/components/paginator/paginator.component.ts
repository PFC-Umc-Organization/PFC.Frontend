import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export const PAGE_SIZES = [50, 100, 200] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

// Páginas
export const pageCount = (total: number, size: number): number => Math.max(1, Math.ceil(total / size));

// Página
export function pageOf<T>(items: readonly T[], page: number, size: number): T[] {
  const current = Math.min(Math.max(page, 1), pageCount(items.length, size));
  return items.slice((current - 1) * size, current * size);
}

// Componente
@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.scss',
})
export class PaginatorComponent {
  readonly total = input.required<number>();
  readonly page = model(1);
  readonly size = model<PageSize>(PAGE_SIZES[0]);
  readonly label = input('itens');

  protected readonly sizes = PAGE_SIZES;
  protected readonly pages = computed(() => pageCount(this.total(), this.size()));
  protected readonly current = computed(() => Math.min(Math.max(this.page(), 1), this.pages()));
  protected readonly from = computed(() => (this.total() ? (this.current() - 1) * this.size() + 1 : 0));
  protected readonly to = computed(() => Math.min(this.current() * this.size(), this.total()));

  // Navegação
  go(page: number): void {
    this.page.set(Math.min(Math.max(page, 1), this.pages()));
  }

  // Tamanho
  setSize(event: Event): void {
    this.size.set(Number((event.target as HTMLSelectElement).value) as PageSize);
    this.page.set(1);
  }
}
