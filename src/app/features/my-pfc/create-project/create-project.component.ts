import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PROJECT_LIMITS, parseClassmates, rgmOf } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** The creator joins at once; each classmate gets an invitation. */
@Component({
  selector: 'app-create-project',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './create-project.component.html',
  styles: '.error { margin-top: 0.75rem; font-size: 0.875rem; font-weight: 600; color: var(--destructive); }',
})
export class CreateProjectComponent {
  private readonly projectService = inject(ProjectService);
  private readonly auth = inject(AuthService);
  private readonly ownRgm = computed(() => rgmOf(this.auth.user()));

  readonly created = output();

  readonly form = inject(FormBuilder).nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(PROJECT_LIMITS.nome)]],
    descricao: ['', [Validators.maxLength(PROJECT_LIMITS.descricao)]],
    colegas: [''],
  });
  readonly error = signal('');
  private readonly createAction = action(
    (body: Parameters<ProjectService['createMine']>[0]) => this.projectService.createMine(body),
    { onSuccess: () => this.created.emit(), onError: (e) => this.error.set(e.message) },
  );
  readonly creating = this.createAction.pending;

  invalid(name: 'nome' | 'descricao'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  create(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nome, descricao, colegas } = this.form.getRawValue();
    const classmates = parseClassmates(colegas, this.ownRgm());
    if ('erro' in classmates) {
      this.error.set(classmates.erro);
      return;
    }
    this.createAction.run({ nome: nome.trim(), descricao: descricao.trim(), integrantes: classmates.rgms });
  }
}
