import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';

import { PROJECT_LIMITS, ProjectDetail, cohortLabel, rgmOf } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import { action } from '../../../core/state/action';

// Componente
@Component({
  selector: 'app-group-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-card.component.html',
  styleUrl: './group-card.component.scss',
})
export class GroupCardComponent {
  private readonly projectService = inject(ProjectService);
  private readonly auth = inject(AuthService);

  readonly detail = input.required<ProjectDetail>();
  readonly saved = output<string>();

  protected readonly cohortLabel = cohortLabel;
  protected readonly limit = PROJECT_LIMITS.descricao;
  protected readonly myRgm = computed(() => rgmOf(this.auth.user()));

  // ---------------------------------------------------------------------------
  // Descrição
  // ---------------------------------------------------------------------------

  readonly editing = linkedSignal(() => {
    this.detail().projeto.descricao;
    return false;
  });
  readonly draft = linkedSignal(() => this.detail().projeto.descricao ?? '');

  private readonly saveAction = action(
    (description: string) => this.projectService.update(this.detail().projeto.id, { nome: this.detail().projeto.nome, descricao: description }),
    { onSuccess: (_r, description) => this.saved.emit(description) },
  );
  readonly saving = this.saveAction.pending;
  readonly error = this.saveAction.error;

  // Edição
  setDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  // Gravação
  save(): void {
    this.saveAction.run(this.draft().trim());
  }
}
