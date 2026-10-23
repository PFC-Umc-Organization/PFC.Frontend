import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, combineLatest, of, startWith, switchMap } from 'rxjs';

import { Project, User, isStaff } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ProjectService } from '../../../core/services/project.service';
import { UserService } from '../../../core/services/user.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CohortPickerComponent } from '../cohort-picker/cohort-picker.component';
import { PfcManagementStore } from '../pfc-management.store';
import { ProjectEditorComponent } from '../project-editor/project-editor.component';

@Component({
  selector: 'app-project-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CohortPickerComponent, ProjectEditorComponent],
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

  private readonly users = toSignal(inject(UserService).list().pipe(catchError(() => of([] as User[]))), {
    initialValue: [] as User[],
  });
  readonly advisors = computed(() => this.users().filter((u) => isStaff(u.perfil)));

  userName(id: string): string {
    return this.users().find((u) => u.id === id)?.nome ?? '—';
  }

  readonly nameByRgm = (rgm: string): string => this.users().find((u) => u.rgm === rgm)?.nome ?? rgm;

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
      message: `Excluir o PFC "${name}"? Essa ação não pode ser desfeita.`,
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
