import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ehEquipeAcademica } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { PainelAlunoComponent } from './painel-aluno.component';
import { PainelEquipeComponent } from './painel-equipe.component';

/** Tela inicial: cada perfil monta só o próprio painel (e faz só as próprias chamadas). */
@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [PainelEquipeComponent, PainelAlunoComponent],
  template: `
    <div class="page">
      @if (equipe()) {
        <app-painel-equipe />
      } @else {
        <app-painel-aluno />
      }
    </div>
  `,
})
export class InicioComponent {
  private readonly auth = inject(AuthService);
  readonly equipe = computed(() => ehEquipeAcademica(this.auth.perfil()));
}
