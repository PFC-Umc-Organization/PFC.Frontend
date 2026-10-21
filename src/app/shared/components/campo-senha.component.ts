import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { IconeComponent } from './icone.component';

/** Campo de senha com o botão de mostrar/ocultar. */
@Component({
  selector: 'app-campo-senha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent],
  template: `
    <div class="senha-wrap" [class.control-wrap]="comIcone()">
      @if (comIcone()) {
        <app-icone nome="cadeado" class="control-wrap__icon" />
      }
      <input
        [id]="campoId()"
        [type]="visivel() ? 'text' : 'password'"
        class="control"
        [placeholder]="placeholder()"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-describedby]="descricao() || null"
        [formControl]="controle()"
        [class.control--invalid]="invalido()"
      />
      <button
        type="button"
        class="senha-wrap__botao"
        [attr.aria-label]="visivel() ? 'Ocultar senha' : 'Mostrar senha'"
        [attr.aria-pressed]="visivel()"
        [attr.aria-controls]="campoId()"
        (click)="visivel.set(!visivel())"
      >
        <app-icone [nome]="visivel() ? 'olho-fechado' : 'olho'" />
      </button>
    </div>
  `,
})
export class CampoSenhaComponent {
  readonly campoId = input.required<string>();
  readonly controle = input.required<FormControl<string>>();
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly placeholder = input('••••••••');
  readonly invalido = input(false);
  readonly comIcone = input(false);
  /** id do texto de ajuda ligado ao campo. */
  readonly descricao = input('');

  readonly visivel = signal(false);
}
