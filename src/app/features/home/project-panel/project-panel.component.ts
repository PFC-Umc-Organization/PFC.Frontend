import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';

import { PROJECT_LIMITS, Project, User } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ProjectService } from '../../../core/services/project.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ProjectEditorComponent } from '../../pfc-management/project-editor/project-editor.component';

// Componente
@Component({
  selector: 'app-project-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ProjectEditorComponent],
  templateUrl: './project-panel.component.html',
  styleUrl: './project-panel.component.scss',
})
export class ProjectPanelComponent {
  private readonly projectService = inject(ProjectService);
  private readonly confirmation = inject(ConfirmationService);

  readonly project = input.required<Project>();
  readonly advisors = input.required<User[]>();
  readonly nameByRgm = input.required<(rgm: string) => string>();
  readonly embedded = input(false);
  readonly manage = input(true);
  readonly advisorName = input('');
  readonly closed = output();
  readonly changed = output();

  readonly editing = signal(false);

  // ---------------------------------------------------------------------------
  // Descrição
  // ---------------------------------------------------------------------------

  protected readonly limit = PROJECT_LIMITS.descricao;
  readonly editingDescription = linkedSignal(() => {
    this.project().descricao;
    return false;
  });
  readonly draft = linkedSignal(() => this.project().descricao ?? '');
  private readonly descriptionAction = action(
    (projectId: string, name: string, description: string) => this.projectService.update(projectId, { nome: name, descricao: description }),
    { onSuccess: () => this.changed.emit() },
  );
  readonly savingDescription = this.descriptionAction.pending;
  readonly descriptionError = this.descriptionAction.error;

  // Edição
  setDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  // Gravação
  async saveDescription(): Promise<void> {
    const project = this.project();
    const confirmed = await this.confirmation.confirm({
      title: 'Salvar descrição',
      message: `Salvar a nova descrição do PFC "${project.nome}"?`,
      confirmText: 'Salvar',
    });
    if (confirmed) {
      this.descriptionAction.run(project.id, project.nome, this.draft().trim());
    }
  }

  // ---------------------------------------------------------------------------
  // Orientador
  // ---------------------------------------------------------------------------

  private readonly advisorAction = action(
    (projectId: string, advisorId: string) =>
      advisorId ? this.projectService.setAdvisor(projectId, advisorId) : this.projectService.removeAdvisor(projectId),
    { onSuccess: () => this.changed.emit() },
  );
  private readonly removeAction = action((projectId: string) => this.projectService.remove(projectId), {
    onSuccess: () => {
      this.changed.emit();
      this.closed.emit();
    },
  });
  readonly removing = this.removeAction.pending;
  readonly error = computed(() => this.advisorAction.error() || this.removeAction.error());

  readonly members = computed(() => this.project().integrantes.map((rgm) => ({ rgm, nome: this.nameByRgm()(rgm) })));

  // Atribuição
  async setAdvisor(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const advisorId = select.value;
    const project = this.project();
    const advisor = this.advisors().find((a) => a.id === advisorId)?.nome ?? 'o orientador escolhido';
    const confirmed = await this.confirmation.confirm(
      advisorId
        ? { title: 'Definir orientador', message: `Definir ${advisor} como orientador do PFC "${project.nome}"?`, confirmText: 'Confirmar' }
        : { title: 'Remover orientador', message: `Deixar o PFC "${project.nome}" sem orientador?`, confirmText: 'Remover', danger: true },
    );
    if (!confirmed) {
      select.value = project.orientadorId ?? '';
      return;
    }
    this.advisorAction.run(project.id, advisorId);
  }

  // Gravação
  saved(): void {
    this.editing.set(false);
    this.changed.emit();
  }

  // Exclusão
  async remove(): Promise<void> {
    const name = this.project().nome;
    const confirmed = await this.confirmation.confirm({
      title: 'Excluir PFC',
      message: `Excluir o PFC "${name}"? As entregas, os convites, as referências e os arquivos do grupo também serão apagados. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.removeAction.run(this.project().id);
  }
}
