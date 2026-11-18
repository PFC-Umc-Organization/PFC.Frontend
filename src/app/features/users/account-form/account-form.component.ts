import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserService } from '../../../core/services/user.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';

// Componente
@Component({
  selector: 'app-account-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './account-form.component.html',
})
export class AccountFormComponent {
  private readonly userService = inject(UserService);

  readonly form = inject(FormBuilder).nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/@umc\.br$/i)]],
    perfil: ['ORIENTADOR' as 'ORIENTADOR' | 'ADMIN', [Validators.required]],
  });
  readonly closed = output();
  readonly created = output<string>();
  private readonly createAction = action((body: Parameters<UserService['createAccount']>[0]) => this.userService.createAccount(body), {
    onSuccess: (response) => {
      this.form.reset({ nome: '', email: '', perfil: 'ORIENTADOR' });
      this.created.emit(response.mensagem);
    },
  });
  readonly saving = this.createAction.pending;
  readonly error = this.createAction.error;

  // Validação
  invalid(name: 'nome' | 'email'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  // Criação
  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.createAction.run(this.form.getRawValue());
  }
}
