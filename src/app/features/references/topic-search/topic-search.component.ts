import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { FoundArticle, shortAuthorship } from '../../../core/models';
import { ReferenceService } from '../../../core/services/reference.service';
import { action } from '../../../core/state/action';
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
  readonly done = signal(false);
  private readonly searchAction = action((term: string, page: number) => this.referenceService.search(term, page), {
    onSuccess: (result) => {
      this.done.set(true);
      this.total.set(result.total);
      this.articles.update((current) => [...current, ...result.artigos]);
    },
    onError: () => this.done.set(true),
    concurrency: 'switch',
  });
  readonly searching = this.searchAction.pending;
  /** A failure of adding an article, reported by the add button. */
  readonly addFailure = signal('');
  readonly error = computed(() => this.searchAction.error() || this.addFailure());

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
    this.addFailure.set('');
    this.page.set(page);
    this.searchAction.run(this.searched, page);
  }
}
