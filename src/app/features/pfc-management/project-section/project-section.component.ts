import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap, tap } from 'rxjs';

import { Project, ProjectPenalties, User, isStaff } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
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

  readonly error = signal('');
  readonly editingId = signal<string | null>(null);
  readonly editingAdvisorId = signal<string | null>(null);

  private readonly reload$ = new Subject<void>();
  readonly projects = toSignal(
    combineLatest([toObservable(computed(() => this.store.program()?.id)), this.reload$.pipe(startWith(undefined))]).pipe(
      switchMap(([programId]) =>
        programId
          ? this.projectService.list(programId).pipe(
              catchError((e: Error) => {
                this.error.set(e.message);
                return of([] as Project[]);
              }),
            )
          : of([] as Project[]),
      ),
    ),
    { initialValue: [] as Project[] },
  );

  private readonly penaltyService = inject(PenaltyService);
  readonly penaltiesError = signal('');
  private readonly reloadPenalties$ = new Subject<void>();
  /** Undefined while loading and null after a failure, so a status is never guessed. */
  readonly penalties = toSignal(
    combineLatest([
      toObservable(computed(() => this.store.program()?.id)),
      this.reloadPenalties$.pipe(startWith(undefined)),
    ]).pipe(
      tap(() => this.penaltiesError.set('')),
      switchMap(([programId]) =>
        programId
          ? this.penaltyService.ofProgram(programId).pipe(
              map((list): Map<string, ProjectPenalties> | null => new Map(list.map((p) => [p.projetoId, p]))),
              catchError((e: Error) => {
                this.penaltiesError.set(e.message);
                return of(null);
              }),
              startWith(undefined),
            )
          : of(new Map<string, ProjectPenalties>()),
      ),
    ),
    { initialValue: undefined as Map<string, ProjectPenalties> | null | undefined },
  );

  retryPenalties(): void {
    this.reloadPenalties$.next();
  }

  private readonly userService = inject(UserService);
  readonly usersError = signal('');
  private readonly reloadUsers$ = new Subject<void>();
  private readonly users = toSignal(
    this.reloadUsers$.pipe(
      startWith(undefined),
      tap(() => this.usersError.set('')),
      switchMap(() =>
        this.userService.list().pipe(
          catchError((e: Error) => {
            this.usersError.set(e.message);
            return of([] as User[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as User[] },
  );

  retryUsers(): void {
    this.reloadUsers$.next();
  }

  readonly advisors = computed(() => this.users().filter((u) => isStaff(u.perfil)));

  userName(id: string): string {
    return this.users().find((u) => u.id === id)?.nome ?? '—';
  }

  readonly nameByRgm = (rgm: string): string => this.users().find((u) => u.rgm === rgm)?.nome ?? rgm;

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
    return this.projects().filter((p) => {
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
    this.reload$.next();
  }

  saved(): void {
    this.editingId.set(null);
    this.reload();
  }

  setAdvisor(projectId: string, event: Event): void {
    const advisorId = (event.target as HTMLSelectElement).value;
    this.error.set('');
    const change = advisorId
      ? this.projectService.setAdvisor(projectId, advisorId)
      : this.projectService.removeAdvisor(projectId);
    change.subscribe({
      next: () => {
        this.editingAdvisorId.set(null);
        this.reload();
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  removeAdvisor(projectId: string): void {
    this.error.set('');
    this.projectService.removeAdvisor(projectId).subscribe({
      next: () => this.reload(),
      error: (e: Error) => this.error.set(e.message),
    });
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
    this.error.set('');
    this.projectService.remove(projectId).subscribe({
      next: () => this.reload(),
      error: (e: Error) => this.error.set(e.message),
    });
  }
}
