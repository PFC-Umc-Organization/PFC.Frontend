import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';

import { Cohort, MATERIAL_KIND_LABEL, MaterialKind, cohortLabel } from '../../../core/models';
import { ApiError } from '../../../core/services/http-error';
import { MaterialService } from '../../../core/services/material.service';
import { FilePickerComponent } from '../../../shared/components/file-picker/file-picker.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type Source = 'link' | 'file';

@Component({
  selector: 'app-material-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent, FilePickerComponent],
  templateUrl: './material-form.component.html',
  styleUrl: './material-form.component.scss',
})
export class MaterialFormComponent {
  private readonly materialService = inject(MaterialService);

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
  /** Already in the bucket, ready to publish. */
  readonly file = signal<{ key: string; name: string } | null>(null);
  readonly progress = signal<number | null>(null);
  readonly fileError = signal('');
  readonly saving = signal(false);
  readonly error = signal('');
  readonly published = signal(false);

  /** `url` is disabled for a file, so the form's own validity covers both sources. */
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

  invalid(name: 'titulo' | 'url'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  setSource(source: Source): void {
    this.source.set(source);
    if (source === 'file') {
      this.form.controls.url.disable();
    } else {
      this.form.controls.url.enable();
    }
  }

  upload(file: File): void {
    this.fileError.set('');
    this.published.set(false);
    this.progress.set(0);
    this.materialService.uploadFile(file).subscribe({
      next: (ev) => {
        if (ev.kind === 'progress') {
          this.progress.set(ev.percent);
        } else {
          this.file.set({ key: ev.key, name: file.name });
          this.progress.set(null);
        }
      },
      error: (e: ApiError) => {
        this.progress.set(null);
        this.fileError.set(e.status === 503 ? 'O envio de arquivos ainda não está disponível. Publique um link.' : e.message);
      },
    });
  }

  publish(): void {
    this.error.set('');
    this.published.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.canPublish()) {
      return;
    }
    const { titulo, tipo, url, cursoId, descricao } = this.form.getRawValue();
    this.saving.set(true);
    this.materialService
      .create({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipo,
        cursoId: cursoId || null,
        ...(this.source() === 'link' ? { url: url.trim() } : { arquivo: this.file()!.key }),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.published.set(true);
          this.file.set(null);
          this.form.reset({ tipo, cursoId });
        },
        error: (e: Error) => {
          this.saving.set(false);
          this.error.set(e.message);
        },
      });
  }
}
