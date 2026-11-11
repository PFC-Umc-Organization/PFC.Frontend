import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Project } from '../../../core/models';
import { ProjectService } from '../../../core/services/project.service';
import { action } from '../../../core/state/action';
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
  readonly rgm = signal('');

  private readonly saveAction = action(
    (id: string, body: Parameters<ProjectService['update']>[1]) => this.projectService.update(id, body),
    { onSuccess: () => this.saved.emit() },
  );
  private readonly addMemberAction = action((id: string, rgm: string) => this.projectService.addMember(id, rgm), {
    onSuccess: () => {
      this.rgm.set('');
      this.membersChanged.emit();
    },
  });
  private readonly removeMemberAction = action((id: string, rgm: string) => this.projectService.removeMember(id, rgm), {
    onSuccess: () => this.membersChanged.emit(),
    concurrency: 'merge',
  });
  readonly error = this.saveAction.error;
  /** Validation of the typed RGM, or the failure of adding or removing one. */
  private readonly rgmFormatError = signal('');
  readonly memberError = computed(() => this.rgmFormatError() || this.addMemberAction.error() || this.removeMemberAction.error());

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
    this.saveAction.run(this.project().id, this.form.getRawValue());
  }

  /** Keeps digits only, up to 11. */
  typeRgm(event: Event): void {
    const field = event.target as HTMLInputElement;
    field.value = field.value.replace(/\D/g, '').slice(0, 11);
    this.rgm.set(field.value);
  }

  addMember(): void {
    const rgm = this.rgm().trim();
    this.rgmFormatError.set('');
    if (!/^\d{11}$/.test(rgm)) {
      this.rgmFormatError.set('Informe um RGM válido (11 dígitos, só números).');
      return;
    }
    this.addMemberAction.run(this.project().id, rgm);
  }

  removeMember(rgm: string): void {
    this.rgmFormatError.set('');
    this.removeMemberAction.run(this.project().id, rgm);
  }
}
