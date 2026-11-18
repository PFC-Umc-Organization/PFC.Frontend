import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { Project, User } from '../../../core/models';
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
  readonly closed = output();
  readonly changed = output();

  readonly editing = signal(false);
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

<<<<<<< HEAD
  // Atribuição
  setAdvisor(event: Event): void {
    const advisorId = (event.target as HTMLSelectElement).value;
    this.advisorAction.run(this.project().id, advisorId);
=======
  /** A cancelled confirmation puts the select back on the current advisor. */
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
>>>>>>> a92fd391a775b0e5f17697e30d917af4bb07ea54
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
