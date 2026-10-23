import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { FormattedReference } from '../../../core/models';
import { ReferenceService } from '../../../core/services/reference.service';
import { AddReferenceComponent } from '../add-reference/add-reference.component';

/** Looks a DOI up on Crossref and previews the ABNT reference. */
@Component({
  selector: 'app-doi-lookup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AddReferenceComponent],
  templateUrl: './doi-lookup.component.html',
  styleUrls: ['../search.scss', './doi-lookup.component.scss'],
})
export class DoiLookupComponent {
  private readonly referenceService = inject(ReferenceService);

  readonly projectId = input.required<string>();
  readonly inList = input.required<Set<string>>();
  readonly added = output();
  readonly started = output();

  readonly doi = signal('');
  readonly preview = signal<FormattedReference | null>(null);
  readonly looking = signal(false);
  readonly error = signal('');

  typeDoi(event: Event): void {
    this.doi.set((event.target as HTMLInputElement).value);
  }

  lookUp(event: Event): void {
    event.preventDefault();
    const doi = this.doi().trim();
    if (!doi) {
      return;
    }
    this.started.emit();
    this.looking.set(true);
    this.error.set('');
    this.preview.set(null);
    this.referenceService.byDoi(doi).subscribe({
      next: (reference) => {
        this.looking.set(false);
        this.preview.set(reference);
      },
      error: (e: Error) => {
        this.looking.set(false);
        this.error.set(e.message);
      },
    });
  }
}
