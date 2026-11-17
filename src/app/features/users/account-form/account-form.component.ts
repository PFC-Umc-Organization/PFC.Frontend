import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ConfirmationService } from '../../../core/services/confirmation.service';
import { UserService } from '../../../core/services/user.service';
import { action } from '../../../core/state/action';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** An advisor or coordination account; Cognito e-mails the temporary password. */
@Component({
  selector: 'app-account-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './account-form.component.html',
})
export class AccountFormComponent {
  private readonly userService = inject(UserService);
  private readonly confirmation = inject(ConfirmationService);

  readonly form = inject(FormBuilder).nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, Validators.pattern(/@umc\.br$/i)]],
    perfil: ['ORIENTADOR' as 'ORIENTADOR' | 'ADMIN', [Validators.required]],
  });
  readonly closed = output();
  /** With the backend's confirmation message. */
  readonly created = output<string>();
  private readonly createAction = action((body: Parameters<UserService['createAccount']>[0]) => this.userService.createAccount(body), {
    onSuccess: (response) => {
      this.form.reset({ nome: '', email: '', perfil: 'ORIENTADOR' });
      this.created.emit(response.mensagem);
    },
  });
  readonly saving = this.createAction.pending;
  readonly error = this.createAction.error;

  invalid(name: 'nome' | 'email'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  async create(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nome, email, perfil } = this.form.getRawValue();
    const confirmed = await this.confirmation.confirm({
      title: 'Criar conta',
      message: `Criar a conta de ${perfil === 'ADMIN' ? 'coordenação' : 'orientador'} de ${nome.trim()} (${email.trim()})? A pessoa recebe por e-mail uma senha temporária.`,
      confirmText: 'Criar conta',
    });
    if (!confirmed) {
      return;
    }
    this.createAction.run(this.form.getRawValue());
  }
}
