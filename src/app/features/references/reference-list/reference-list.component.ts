import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { Reference } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';

/**
 * The project's references in ABNT and alphabetical order, as in the
 * paper's "Referências" section. The student edits; the staff only reads.
 */
@Component({
  selector: 'app-reference-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, DeadlinePipe],
  templateUrl: './reference-list.component.html',
  styleUrl: './reference-list.component.scss',
})
export class ReferenceListComponent {
  private readonly referenceService = inject(ReferenceService);
  private readonly confirmation = inject(ConfirmationService);

  readonly references = input.required<Reference[]>();
  readonly projectName = input('');
  readonly editable = input(false);
  readonly loading = input(false);
  readonly error = input('');
  readonly changed = output();

  /** A failed action (remove, copy) shows without hiding the list. */
  private readonly copyWarning = signal('');
  private readonly removeAction = action((projectId: string, id: string) => this.referenceService.remove(projectId, id), {
    onSuccess: () => this.changed.emit(),
  });
  readonly warning = computed(() => this.copyWarning() || this.removeAction.error());
  private readonly removing = signal<string | null>(null);
  readonly removingId = computed(() => (this.removeAction.pending() ? this.removing() : null));
  /** The reference just copied, or 'all'; swaps the button's label. */
  readonly copied = signal<string | null>(null);
  private copiedTimer?: ReturnType<typeof setTimeout>;

  copy(r: Reference): void {
    void this.toClipboard(r.abnt, r.abntHtml, r.id);
  }

  copyAll(): void {
    const list = this.references();
    void this.toClipboard(
      list.map((r) => r.abnt).join('\n\n'),
      list.map((r) => `<p>${r.abntHtml}</p>`).join(''),
      'all',
    );
  }

  async remove(r: Reference): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Remover referência',
      message: `Remover "${r.titulo}" da lista de referências?`,
      confirmText: 'Remover',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.removing.set(r.id);
    this.copyWarning.set('');
    this.removeAction.run(r.projetoId, r.id);
  }

  /** As text and HTML: pasted into Word or Google Docs, the ABNT bold comes along. */
  private async toClipboard(text: string, html: string, marker: string): Promise<void> {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      this.copyWarning.set('Não foi possível copiar. Selecione o texto e copie manualmente.');
      return;
    }
    this.copyWarning.set('');
    this.copied.set(marker);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(null), 2000);
  }
}
