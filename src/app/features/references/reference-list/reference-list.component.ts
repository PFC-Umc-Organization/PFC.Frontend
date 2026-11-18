import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { Reference } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { DeadlinePipe } from '../../../shared/pipes/deadline.pipe';

// Componente
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

  private readonly copyWarning = signal('');
  private readonly removeAction = action((projectId: string, id: string) => this.referenceService.remove(projectId, id), {
    onSuccess: () => this.changed.emit(),
  });
  readonly warning = computed(() => this.copyWarning() || this.removeAction.error());

  // Edição
  readonly editingId = signal<string | null>(null);
  readonly draftDoi = signal('');
  // Aviso
  readonly notice = signal('');
  private readonly replaceAction = action(
    (projectId: string, id: string, doi: string) => this.referenceService.replace(projectId, id, doi),
    {
      onSuccess: () => {
        this.editingId.set(null);
        this.notice.set('Referência atualizada.');
        this.changed.emit();
      },
    },
  );
  readonly saving = this.replaceAction.pending;
  readonly editError = this.replaceAction.error;

  startEdit(r: Reference): void {
    this.notice.set('');
    this.draftDoi.set(r.doi);
    this.editingId.set(r.id);
  }

  setDraft(event: Event): void {
    this.draftDoi.set((event.target as HTMLInputElement).value);
  }

  saveEdit(r: Reference): void {
    const doi = this.draftDoi().trim();
    if (!doi) {
      return;
    }
    this.replaceAction.run(r.projetoId, r.id, doi);
  }
  private readonly removing = signal<string | null>(null);
  readonly removingId = computed(() => (this.removeAction.pending() ? this.removing() : null));
  readonly copied = signal<string | null>(null);
  private copiedTimer?: ReturnType<typeof setTimeout>;

  // Cópia individual
  copy(r: Reference): void {
    void this.toClipboard(r.abnt, r.abntHtml, r.id);
  }

  // Cópia em lote
  copyAll(): void {
    const list = this.references();
    void this.toClipboard(
      list.map((r) => r.abnt).join('\n\n'),
      list.map((r) => `<p>${r.abntHtml}</p>`).join(''),
      'all',
    );
  }

  // Exclusão
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
    this.notice.set('');
    this.removeAction.run(r.projetoId, r.id);
  }

  // Cópia
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
