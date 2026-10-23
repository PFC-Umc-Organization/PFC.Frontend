import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { ReferenceService } from '../../../core/services/reference.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Adds an article to the group's list by its DOI, or says it is already there. */
@Component({
  selector: 'app-add-reference',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  templateUrl: './add-reference.component.html',
  styles: `
    .in-list {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--success);
    }
  `,
})
export class AddReferenceComponent {
  private readonly referenceService = inject(ReferenceService);

  readonly projectId = input.required<string>();
  readonly doi = input<string | undefined>();
  /** The DOIs already in the list, lowercase. */
  readonly inList = input.required<Set<string>>();
  readonly added = output();
  readonly failed = output<string>();

  readonly adding = signal(false);
  readonly present = computed(() => !!this.doi() && this.inList().has(this.doi()!.toLowerCase()));

  add(): void {
    const doi = this.doi();
    if (!doi) {
      return;
    }
    this.adding.set(true);
    this.referenceService.add(this.projectId(), doi).subscribe({
      next: () => {
        this.adding.set(false);
        this.added.emit();
      },
      error: (e: Error) => {
        this.adding.set(false);
        this.failed.emit(e.message);
      },
    });
  }
}
