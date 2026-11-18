import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';

import { Cohort, MATERIAL_KIND_LABEL, MaterialKind, cohortLabel } from '../../../core/models';
import { ApiError } from '../../../core/services/http-error';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { MaterialService } from '../../../core/services/material.service';
import { action } from '../../../core/state/action';
import { FilePickerComponent } from '../../../shared/components/file-picker/file-picker.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

// Tipo
type Source = 'link' | 'file';

// Componente
@Component({
  selector: 'app-material-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, FilePickerComponent],
  templateUrl: './material-form.component.html',
})
export class MaterialFormComponent {
  private readonly materialService = inject(MaterialService);
  private readonly confirmation = inject(ConfirmationService);

  readonly cohorts = input.required<Cohort[]>();
  protected readonly kinds: MaterialKind[] = ['MODELO', 'DOCUMENTO', 'VIDEO', 'LINK'];
  protected readonly kindLabel = MATERIAL_KIND_LABEL;
  protected readonly cohortLabel = cohortLabel;

  readonly form = inject(FormBuilder).nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    tipo: ['MODELO' as MaterialKind, Validators.required],
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/\S+$/)]],
    cursoId: [''],
    descricao: ['', Validators.maxLength(2000)],
  });

  readonly source = signal<Source>('link');
  readonly file = signal<{ key: string; name: string } | null>(null);
  readonly progress = signal<number | null>(null);
  private readonly uploadAction = action((file: File) => this.materialService.uploadFile(file), {
    onSuccess: (ev, file) => {
      if (ev.kind === 'progress') {
        this.progress.set(ev.percent);
      } else {
        this.file.set({ key: ev.key, name: file.name });
        this.progress.set(null);
      }
    },
    onError: (e) => {
      this.progress.set(null);
      this.uploadStatus.set((e as ApiError).status ?? null);
    },
    concurrency: 'switch',
  });
  private readonly publishAction = action(
    (body: Parameters<MaterialService['create']>[0]) => this.materialService.create(body),
    { onSuccess: () => this.afterPublish() },
  );
  private lastKind: MaterialKind = 'MODELO';
  private lastCohort = '';
  readonly fileError = computed(() => {
    const e = this.uploadAction.error();
    return e && this.uploadStatus() === 503
      ? 'O envio de arquivos ainda não está disponível. Publique o material como link.'
      : e;
  });
  private readonly uploadStatus = signal<number | null>(null);
  readonly saving = this.publishAction.pending;
  readonly error = this.publishAction.error;
  readonly closed = output();
  readonly created = output();

  private readonly formValid = toSignal(this.form.statusChanges.pipe(map(() => this.form.valid)), {
    initialValue: false,
  });
  readonly canPublish = computed(
    () =>
      this.formValid() &&
      (this.source() === 'link' || this.file() !== null) &&
      this.progress() === null &&
      !this.saving(),
  );

  // Validação
  invalid(name: 'titulo' | 'url'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  // Origem
  setSource(source: Source): void {
    this.source.set(source);
    if (source === 'file') {
      this.form.controls.url.disable();
    } else {
      this.form.controls.url.enable();
    }
  }

  // Upload
  upload(file: File): void {
    this.uploadStatus.set(null);
    this.progress.set(0);
    this.uploadAction.run(file);
  }

  // Publicação
  async publish(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.canPublish()) {
      return;
    }
    const { titulo, tipo, url, cursoId, descricao } = this.form.getRawValue();
    const cohort = this.cohorts().find((c) => c.id === cursoId);
    const confirmed = await this.confirmation.confirm({
      title: 'Publicar material',
      message: `Publicar o material "${titulo.trim()}" ${cohort ? 'para a turma ' + cohortLabel(cohort) : 'para todas as turmas'}?`,
      confirmText: 'Publicar',
    });
    if (!confirmed) {
      return;
    }
    this.lastKind = tipo;
    this.lastCohort = cursoId;
    this.publishAction.run({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      tipo,
      cursoId: cursoId || null,
      ...(this.source() === 'link' ? { url: url.trim() } : { arquivo: this.file()!.key }),
    });
  }

  // Publicação
  private afterPublish(): void {
    this.file.set(null);
    this.form.reset({ tipo: this.lastKind, cursoId: this.lastCohort });
    this.created.emit();
  }
}
