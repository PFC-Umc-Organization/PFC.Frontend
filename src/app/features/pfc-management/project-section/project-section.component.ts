import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Project, ProjectPenalties, User, isStaff } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { action } from '../../../core/state/action';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CohortPickerComponent } from '../cohort-picker/cohort-picker.component';
import { PfcManagementStore } from '../pfc-management.store';
import { ProjectEditorComponent } from '../project-editor/project-editor.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

type StatusFilter = 'TODOS' | 'EM_ANDAMENTO' | 'REPROVADO';

/** Lowercase and without accents, so "joao" finds "João". */
function folded(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

@Component({
  selector: 'app-project-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CohortPickerComponent, ProjectEditorComponent, ScrollHintDirective],
  templateUrl: './project-section.component.html',
  styleUrl: './project-section.component.scss',
})
export class ProjectSectionComponent {
  protected readonly store = inject(PfcManagementStore);
  private readonly projectService = inject(ProjectService);
  private readonly confirmation = inject(ConfirmationService);

  private readonly advisorAction = action(
    (projectId: string, advisorId: string) =>
      advisorId ? this.projectService.setAdvisor(projectId, advisorId) : this.projectService.removeAdvisor(projectId),
    {
      onSuccess: () => {
        this.editingAdvisorId.set(null);
        this.reload();
      },
      concurrency: 'merge',
    },
  );
  private readonly removeAdvisorAction = action((projectId: string) => this.projectService.removeAdvisor(projectId), {
    onSuccess: () => this.reload(),
    concurrency: 'merge',
  });
  private readonly removeAction = action((projectId: string) => this.projectService.remove(projectId), {
    onSuccess: () => this.reload(),
    concurrency: 'merge',
  });
  readonly removing = this.removeAction.pending;
  /** The failure of the last change made on a row; load failures are `projects.error()`. */
  readonly error = computed(() => this.advisorAction.error() || this.removeAdvisorAction.error() || this.removeAction.error());
  readonly editingId = signal<string | null>(null);
  readonly editingAdvisorId = signal<string | null>(null);

  private readonly programId = computed(() => this.store.program()?.id ?? null);
  /** Load failures are `projects.error()`; `error` is for the changes made on a row. */
  readonly projects = loadable({
    source: (programId: string) => this.projectService.list(programId),
    params: this.programId,
    initial: [] as Project[],
  });

  private readonly penaltyService = inject(PenaltyService);
  private readonly penaltyList = loadable({
    source: (programId: string) => this.penaltyService.ofProgram(programId),
    params: this.programId,
    initial: [] as ProjectPenalties[],
  });
  readonly penaltiesError = this.penaltyList.error;
  /** Undefined while loading and null after a failure, so a status is never guessed. */
  readonly penalties = computed<Map<string, ProjectPenalties> | null | undefined>(() =>
    this.penaltyList.loading()
      ? undefined
      : this.penaltyList.error()
        ? null
        : new Map(this.penaltyList.value().map((p) => [p.projetoId, p])),
  );

  retryPenalties(): void {
    this.penaltyList.reload();
  }

  private readonly userService = inject(UserService);
  private readonly userList = loadable({ source: () => this.userService.list(), initial: [] as User[] });
  private readonly users = this.userList.value;
  readonly usersError = this.userList.error;

  retryUsers(): void {
    this.userList.reload();
  }

  readonly advisors = computed(() => this.users().filter((u) => isStaff(u.perfil)));

  private readonly nameById = computed(() => new Map(this.users().map((u) => [u.id, u.nome])));
  private readonly nameOfRgm = computed(() => new Map(this.users().map((u) => [u.rgm, u.nome])));

  userName(id: string): string {
    return this.nameById().get(id) ?? '—';
  }

  readonly nameByRgm = (rgm: string): string => this.nameOfRgm().get(rgm) ?? rgm;

  readonly search = signal('');
  /** 'TODOS', 'NENHUM' or an advisor's id. */
  readonly advisorFilter = signal('TODOS');
  readonly statusFilter = signal<StatusFilter>('TODOS');
  /** Without the status, filtering by it would hide groups for no reason. */
  readonly statusKnown = computed(() => this.penalties() instanceof Map);
  readonly filtering = computed(
    () => this.search().trim() !== '' || this.advisorFilter() !== 'TODOS' || this.statusFilter() !== 'TODOS',
  );

  readonly visibleProjects = computed(() => {
    const term = folded(this.search().trim());
    const advisor = this.advisorFilter();
    const status = this.statusFilter();
    const penalties = this.penalties();
    return this.projects.value().filter((p) => {
      const text = [p.nome, ...p.integrantes, ...p.integrantes.map(this.nameByRgm)].join(' ');
      if (term && !folded(text).includes(term)) {
        return false;
      }
      if (advisor === 'NENHUM' ? p.orientadorId : advisor !== 'TODOS' && p.orientadorId !== advisor) {
        return false;
      }
      if (status === 'TODOS' || !penalties) {
        return true;
      }
      const group = penalties.get(p.id);
      return !!group && group.reprovado === (status === 'REPROVADO');
    });
  });

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setAdvisorFilter(event: Event): void {
    this.advisorFilter.set((event.target as HTMLSelectElement).value);
  }

  setStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as StatusFilter);
  }

  memberNames(p: Project): string {
    return p.integrantes.map(this.nameByRgm).join(', ') || '—';
  }

  reload(): void {
    this.projects.reload();
    this.penaltyList.reload();
  }

  saved(): void {
    this.editingId.set(null);
    this.reload();
  }

  setAdvisor(projectId: string, event: Event): void {
    const advisorId = (event.target as HTMLSelectElement).value;
    this.advisorAction.run(projectId, advisorId);
  }

  removeAdvisor(projectId: string): void {
    this.removeAdvisorAction.run(projectId);
  }

  async remove(projectId: string, name: string): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Excluir PFC',
      message: `Excluir o PFC "${name}"? As entregas, os convites, as referências e os arquivos do grupo também serão apagados. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.removeAction.run(projectId);
  }
}
