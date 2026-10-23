import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Project } from '../../../core/models';
import { ProjectService } from '../../../core/services/project.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Edits a project in place: name, description and members (by RGM). */
@Component({
  selector: 'app-project-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './project-editor.component.html',
  styleUrl: './project-editor.component.scss',
})
export class ProjectEditorComponent implements OnInit {
  private readonly projectService = inject(ProjectService);

  readonly project = input.required<Project>();
  readonly nameByRgm = input.required<(rgm: string) => string>();
  readonly saved = output();
  readonly membersChanged = output();
  readonly cancelled = output();

  readonly form = inject(FormBuilder).nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    descricao: [''],
  });
  readonly error = signal('');
  readonly memberError = signal('');
  readonly rgm = signal('');

  /** Filled once: reloading the list after a member change keeps what was typed. */
  ngOnInit(): void {
    const { nome, descricao } = this.project();
    this.form.setValue({ nome, descricao });
  }

  nameInvalid(): boolean {
    const c = this.form.controls.nome;
    return c.invalid && c.touched;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.projectService.update(this.project().id, this.form.getRawValue()).subscribe({
      next: () => this.saved.emit(),
      error: (e: Error) => this.error.set(e.message),
    });
  }

  /** Keeps digits only, up to 11. */
  typeRgm(event: Event): void {
    const field = event.target as HTMLInputElement;
    field.value = field.value.replace(/\D/g, '').slice(0, 11);
    this.rgm.set(field.value);
  }

  addMember(): void {
    const rgm = this.rgm().trim();
    this.memberError.set('');
    if (!/^\d{11}$/.test(rgm)) {
      this.memberError.set('Informe um RGM válido (11 dígitos, só números).');
      return;
    }
    this.projectService.addMember(this.project().id, rgm).subscribe({
      next: () => {
        this.rgm.set('');
        this.membersChanged.emit();
      },
      error: (e: Error) => this.memberError.set(e.message),
    });
  }

  removeMember(rgm: string): void {
    this.memberError.set('');
    this.projectService.removeMember(this.project().id, rgm).subscribe({
      next: () => this.membersChanged.emit(),
      error: (e: Error) => this.memberError.set(e.message),
    });
  }
}
