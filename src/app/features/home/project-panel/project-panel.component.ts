import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { Project, User } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ProjectService } from '../../../core/services/project.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ProjectEditorComponent } from '../../pfc-management/project-editor/project-editor.component';

/**
 * A group as the coordination manages it from the panel's grid: advisor,
 * members, edit and delete. Whatever changes asks the screen to reload.
 */
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
  /** Advisors and admins an advisor can be picked from. */
  readonly advisors = input.required<User[]>();
  readonly nameByRgm = input.required<(rgm: string) => string>();
  readonly closed = output();
  /** After any change, so the grid and the list read the group again. */
  readonly changed = output();

  readonly editing = signal(false);
  readonly error = signal('');

  readonly members = computed(() => this.project().integrantes.map((rgm) => ({ rgm, nome: this.nameByRgm()(rgm) })));

  setAdvisor(event: Event): void {
    const advisorId = (event.target as HTMLSelectElement).value;
    this.error.set('');
    const change = advisorId
      ? this.projectService.setAdvisor(this.project().id, advisorId)
      : this.projectService.removeAdvisor(this.project().id);
    change.subscribe({
      next: () => this.changed.emit(),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  saved(): void {
    this.editing.set(false);
    this.changed.emit();
  }

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
    this.error.set('');
    this.projectService.remove(this.project().id).subscribe({
      next: () => {
        this.changed.emit();
        this.closed.emit();
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
