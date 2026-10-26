import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { Course } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { CourseService } from '../../../core/services/course.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CohortsStore } from '../cohorts.store';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

const nameForm = () => new FormGroup({ nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });

@Component({
  selector: 'app-course-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, ScrollHintDirective],
  templateUrl: './course-section.component.html',
  styles: ':host { display: contents; } .editor { padding: 0.5rem 0; }',
})
export class CourseSectionComponent {
  protected readonly store = inject(CohortsStore);
  private readonly courseService = inject(CourseService);
  private readonly confirmation = inject(ConfirmationService);

  readonly form = nameForm();
  readonly editForm = nameForm();
  readonly name = this.form.controls.nome;
  readonly editName = this.editForm.controls.nome;
  readonly creating = signal(false);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);

  invalid(control: FormControl<string>): boolean {
    return control.touched && !control.value.trim();
  }

  create(): void {
    this.store.coursesError.set('');
    if (!this.name.value.trim()) {
      this.name.markAsTouched();
      return;
    }
    this.creating.set(true);
    this.courseService.create(this.name.value).subscribe({
      next: () => {
        this.creating.set(false);
        this.form.reset({ nome: '' });
        this.formOpen.set(false);
        this.store.reloadCourses();
      },
      error: (e: Error) => {
        this.creating.set(false);
        this.store.coursesError.set(e.message);
      },
    });
  }

  startEdit(course: Course): void {
    this.store.coursesError.set('');
    this.editingId.set(course.id);
    this.editName.setValue(course.nome);
  }

  saveEdit(courseId: string): void {
    if (!this.editName.value.trim()) {
      this.editName.markAsTouched();
      return;
    }
    this.store.coursesError.set('');
    this.courseService.update(courseId, this.editName.value).subscribe({
      next: () => {
        this.editingId.set(null);
        this.store.reloadCourses();
        // The course's cohorts are read with the new name.
        this.store.reloadCohorts();
      },
      error: (e: Error) => this.store.coursesError.set(e.message),
    });
  }

  async remove(course: Course): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Excluir curso',
      message: `Excluir o curso "${course.nome}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.store.coursesError.set('');
    this.courseService.remove(course.id).subscribe({
      next: () => this.store.reloadCourses(),
      error: (e: Error) => this.store.coursesError.set(e.message),
    });
  }
}
