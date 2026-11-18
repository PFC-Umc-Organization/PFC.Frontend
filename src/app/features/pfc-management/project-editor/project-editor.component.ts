import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Project } from '../../../core/models';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ProjectService } from '../../../core/services/project.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';

// Componente
@Component({
  selector: 'app-project-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './project-editor.component.html',
  styleUrl: './project-editor.component.scss',
})
export class ProjectEditorComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly confirmation = inject(ConfirmationService);

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
  readonly saving = this.saveAction.pending;
  readonly error = this.saveAction.error;
  private readonly rgmFormatError = signal('');
  readonly memberError = computed(() => this.rgmFormatError() || this.addMemberAction.error() || this.removeMemberAction.error());

  // Inicialização
  ngOnInit(): void {
    const { nome, descricao } = this.project();
    this.form.setValue({ nome, descricao });
  }

  // Validação
  nameInvalid(): boolean {
    const c = this.form.controls.nome;
    return c.invalid && c.touched;
  }

  // Gravação
  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const confirmed = await this.confirmation.confirm({
      title: 'Salvar PFC',
      message: `Salvar o nome e a descrição do PFC "${this.form.controls.nome.value.trim()}"?`,
      confirmText: 'Salvar',
    });
    if (!confirmed) {
      return;
    }
    this.saveAction.run(this.project().id, this.form.getRawValue());
  }

  // Digitação
  typeRgm(event: Event): void {
    const field = event.target as HTMLInputElement;
    field.value = field.value.replace(/\D/g, '').slice(0, 11);
    this.rgm.set(field.value);
  }

  // Inclusão
  async addMember(): Promise<void> {
    const rgm = this.rgm().trim();
    this.rgmFormatError.set('');
    if (!/^\d{11}$/.test(rgm)) {
      this.rgmFormatError.set('Informe um RGM válido (11 dígitos, só números).');
      return;
    }
    const confirmed = await this.confirmation.confirm({
      title: 'Incluir integrante',
      message: `Incluir o RGM ${rgm} no PFC "${this.project().nome}"?`,
      confirmText: 'Incluir',
    });
    if (!confirmed) {
      return;
    }
    this.addMemberAction.run(this.project().id, rgm);
  }

  // Remoção
  async removeMember(rgm: string): Promise<void> {
    this.rgmFormatError.set('');
    const name = this.nameByRgm()(rgm);
    const confirmed = await this.confirmation.confirm({
      title: 'Remover integrante',
      message: `Remover ${name === rgm ? 'o RGM ' + rgm : name + ' (RGM ' + rgm + ')'} do PFC "${this.project().nome}"?`,
      confirmText: 'Remover',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.removeMemberAction.run(this.project().id, rgm);
  }
}
