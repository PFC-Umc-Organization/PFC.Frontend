import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { ReferenceService } from '../../../core/services/reference.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';

// Componente
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
  readonly inList = input.required<Set<string>>();
  readonly added = output();
  readonly failed = output<string>();

  private readonly addAction = action((projectId: string, doi: string) => this.referenceService.add(projectId, doi), {
    onSuccess: () => this.added.emit(),
    onError: (e) => this.failed.emit(e.message),
  });
  readonly adding = this.addAction.pending;
  readonly present = computed(() => !!this.doi() && this.inList().has(this.doi()!.toLowerCase()));

  // Inclusão
  add(): void {
    const doi = this.doi();
    if (!doi) {
      return;
    }
    this.addAction.run(this.projectId(), doi);
  }
}
