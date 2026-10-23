import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { FoundArticle, shortAuthorship } from '../../../core/models';
import { ReferenceService } from '../../../core/services/reference.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AddReferenceComponent } from '../add-reference/add-reference.component';

/** Search by topic on OpenAlex, one page at a time. */
@Component({
  selector: 'app-topic-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AddReferenceComponent],
  templateUrl: './topic-search.component.html',
  styleUrls: ['../search.scss', './topic-search.component.scss'],
})
export class TopicSearchComponent {
  private readonly referenceService = inject(ReferenceService);

  /** Empty without a group: articles can be searched but not added. */
  readonly projectId = input.required<string>();
  readonly inList = input.required<Set<string>>();
  readonly added = output();
  readonly started = output();

  protected readonly authorship = shortAuthorship;
  readonly term = signal('');
  private searched = '';
  readonly articles = signal<FoundArticle[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly searching = signal(false);
  readonly done = signal(false);
  readonly error = signal('');

  typeTerm(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
  }

  count(n: number): string {
    return n.toLocaleString('pt-BR');
  }

  details(a: FoundArticle): string {
    return [a.veiculo, a.ano?.toString(), `${this.count(a.citacoes)} ${a.citacoes === 1 ? 'citação' : 'citações'}`]
      .filter(Boolean)
      .join(' · ');
  }

  search(event: Event): void {
    event.preventDefault();
    const term = this.term().trim();
    if (term.length < 3) {
      return;
    }
    this.searched = term;
    this.started.emit();
    this.articles.set([]);
    this.load(1);
  }

  more(): void {
    this.load(this.page() + 1);
  }

  private load(page: number): void {
    this.searching.set(true);
    this.error.set('');
    this.page.set(page);
    this.referenceService.search(this.searched, page).subscribe({
      next: (result) => {
        this.searching.set(false);
        this.done.set(true);
        this.total.set(result.total);
        this.articles.update((current) => [...current, ...result.artigos]);
      },
      error: (e: Error) => {
        this.searching.set(false);
        this.done.set(true);
        this.error.set(e.message);
      },
    });
  }
}
