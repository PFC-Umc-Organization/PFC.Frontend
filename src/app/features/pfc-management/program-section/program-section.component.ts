import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, startWith, switchMap, tap } from 'rxjs';

import { cohortLabel } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ProgramService } from '../../../core/services/program.service';
import { ProjectService } from '../../../core/services/project.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PfcManagementStore } from '../pfc-management.store';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

@Component({
  selector: 'app-program-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ScrollHintDirective],
  templateUrl: './program-section.component.html',
  styleUrl: './program-section.component.scss',
})
export class ProgramSectionComponent {
  protected readonly store = inject(PfcManagementStore);
  private readonly programService = inject(ProgramService);
  private readonly projectService = inject(ProjectService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly cohortLabel = cohortLabel;

  /** The cohort whose program is being created. */
  readonly creating = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly newCohortId = signal('');

  readonly countError = signal('');
  private readonly reloadCount$ = new Subject<void>();
  /**
   * Every project of every program, only to count them; undefined while
   * loading or after a failure, so an unknown count never reads as zero and
   * unlocks moving or removing the program.
   */
  private readonly allProjects = toSignal(
    this.reloadCount$.pipe(
      startWith(undefined),
      tap(() => this.countError.set('')),
      switchMap(() =>
        this.projectService.list().pipe(
          catchError((e: Error) => {
            this.countError.set(e.message);
            return of(undefined);
          }),
        ),
      ),
    ),
    { initialValue: undefined },
  );

  retryCount(): void {
    this.reloadCount$.next();
  }

  /**
   * One row per cohort, with its program or the button to create it, plus
   * programs whose cohort was removed.
   */
  readonly rows = computed(() => {
    if (this.store.loadError()) {
      return [];
    }
    const programs = this.store.programs();
    const count = (programId: string) => this.allProjects()?.filter((x) => x.programaId === programId).length;
    const cohortRows = this.store.cohorts().map((c) => {
      const program = programs.find((p) => p.cursoId === c.id);
      return {
        key: c.id,
        cohortId: c.id,
        label: cohortLabel(c),
        programId: program?.id ?? null,
        projects: program ? count(program.id) : 0,
      };
    });
    const orphans = programs
      .filter((p) => !this.store.cohorts().some((c) => c.id === p.cursoId))
      .map((p) => ({ key: p.id, cohortId: p.cursoId, label: 'Turma removida', programId: p.id, projects: count(p.id) }));
    return [...cohortRows, ...orphans].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  });
  readonly withProgram = computed(() => this.rows().filter((r) => r.programId).length);
  /** Cohorts a program can move to: the ones without a program. */
  readonly freeCohorts = computed(() =>
    this.store.cohorts().filter((c) => !this.store.programs().some((p) => p.cursoId === c.id)),
  );

  create(cohortId: string): void {
    this.store.programsError.set('');
    this.creating.set(cohortId);
    this.programService.create({ cursoId: cohortId }).subscribe({
      next: () => {
        this.creating.set(null);
        this.store.reloadPrograms();
      },
      error: (e: Error) => {
        this.creating.set(null);
        this.store.programsError.set(e.message);
      },
    });
  }

  startEdit(programId: string, cohortId: string): void {
    this.store.programsError.set('');
    this.newCohortId.set(cohortId);
    this.editingId.set(programId);
  }

  saveEdit(programId: string): void {
    this.store.programsError.set('');
    this.programService.update(programId, this.newCohortId()).subscribe({
      next: () => {
        this.editingId.set(null);
        this.store.reloadPrograms();
      },
      error: (e: Error) => this.store.programsError.set(e.message),
    });
  }

  async remove(programId: string, cohort: string): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Excluir programa de PFC',
      message: `Excluir o programa de PFC de "${cohort}"? A exclusão só é aceita se nenhum PFC tiver sido cadastrado no programa. Depois dela, os alunos da turma não poderão cadastrar PFCs até que um novo programa seja criado.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.store.programsError.set('');
    this.programService.remove(programId).subscribe({
      next: () => this.store.reloadPrograms(),
      error: (e: Error) => this.store.programsError.set(e.message),
    });
  }
}
