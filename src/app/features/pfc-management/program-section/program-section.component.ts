import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { Project, courseShiftLabel } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ProgramService } from '../../../core/services/program.service';
import { ProjectService } from '../../../core/services/project.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CohortPickerComponent } from '../cohort-picker/cohort-picker.component';
import { PfcManagementStore } from '../pfc-management.store';

@Component({
  selector: 'app-program-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CohortPickerComponent],
  templateUrl: './program-section.component.html',
  styleUrl: './program-section.component.scss',
})
export class ProgramSectionComponent {
  protected readonly store = inject(PfcManagementStore);
  private readonly programService = inject(ProgramService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly courseShiftLabel = courseShiftLabel;

  readonly error = signal('');
  readonly creating = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly newCohortId = signal('');

  /** Every project of every program, only to count them per program. */
  private readonly allProjects = toSignal(
    inject(ProjectService).list().pipe(catchError(() => of([] as Project[]))),
    { initialValue: [] as Project[] },
  );

  readonly rows = computed(() =>
    this.store
      .programs()
      .map((p) => {
        const cohort = this.store.cohorts().find((c) => c.id === p.cursoId);
        return {
          id: p.id,
          cohortId: p.cursoId,
          cohort: cohort ? courseShiftLabel(cohort) : 'Turma removida',
          term: cohort?.periodo ?? '—',
          projects: this.allProjects().filter((x) => x.programaId === p.id).length,
        };
      })
      .sort((a, b) => a.cohort.localeCompare(b.cohort, 'pt-BR') || a.term.localeCompare(b.term)),
  );

  create(): void {
    this.error.set('');
    this.creating.set(true);
    this.programService.create({ cursoId: this.store.cohortId() }).subscribe({
      next: () => {
        this.creating.set(false);
        this.store.reloadPrograms();
      },
      error: (e: Error) => {
        this.creating.set(false);
        this.error.set(e.message);
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
      message: `Excluir o programa de PFC de "${cohort}"? Os alunos dessa turma deixam de poder criar PFC até o programa ser criado de novo.`,
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
