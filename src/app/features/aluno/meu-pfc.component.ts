import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';

import { Projeto, ProjetoDetalhe } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { IconeComponent } from '../../shared/components/icone.component';


@Component({
  selector: 'app-meu-pfc',
  standalone: true,
  imports: [IconeComponent],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Meu grupo</p>
        <h1 class="page-title mt-2">PFC</h1>
        <p class="lead mt-2">
          Acompanhe o seu Projeto Final de Curso, o grupo e o orientador
          definidos pela coordenação.
        </p>
      </header>

      @if (meuProjetoDetalhe(); as detalhe) {
        <section class="card">
          <div class="card__body">
            <p class="eyebrow">Projeto cadastrado</p>
            <h2 class="page-title mt-2">{{ detalhe.projeto.nome }}</h2>
            <p class="lead mt-2">{{ detalhe.projeto.descricao }}</p>
            <p class="text-sm mt-4">
              <span class="cell-strong">Orientador: </span>
              @if (detalhe.orientador) {
                {{ detalhe.orientador.nome }}
              } @else {
                <span class="muted">
                  Ainda não definido pelo coordenador de PFC.
                </span>
              }
            </p>
          </div>
        </section>

        <section class="card card--flush">
          <div class="card__head">
            <app-icone nome="usuarios" class="card__head-icone" />
            <h2 class="section-title">Integrantes do grupo</h2>
          </div>
          <ul class="integrantes__lista">
            @for (i of detalhe.integrantes; track i.rgm) {
              <li class="integrante">
                <app-icone nome="usuarios" class="integrante__icone" />
                <span>
                  @if (i.nome) {
                    <span class="cell-strong">{{ i.nome }}</span>
                  } @else {
                    <span class="cell-strong muted">
                      RGM {{ i.rgm }} (aguardando cadastro)
                    </span>
                  }
                </span>
              </li>
            }
          </ul>
        </section>
      } @else {
        <section class="card">
          <div class="card__body">
            <p class="lead">
              Você ainda não foi alocado a um PFC. Fale com a coordenação
              para entrar em um grupo.
            </p>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .card__head-icone {
      --icone-size: 1.125rem;
      color: var(--primary);
    }

    .integrantes__lista {
      display: grid;
      gap: 0.75rem;
      margin: 0;
      padding: 1.25rem;
      list-style: none;
    }

    .integrante {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .integrante__icone {
      --icone-size: 1rem;
      color: var(--bronze);
      margin-top: 0.125rem;
    }
  `,
})
export class MeuPfcComponent {
  private readonly auth = inject(AuthService);
  private readonly projetoService = inject(ProjetoService);

  /** `integrantes` guarda RGM, não `Usuario.id` — a busca é pelo RGM do aluno. */
  private readonly meuRgm = computed(() => this.auth.usuario()?.rgm ?? '');

  private readonly meuProjetoBase = toSignal(
    toObservable(this.meuRgm).pipe(
      switchMap((rgm) => (rgm ? this.projetoService.doAluno(rgm) : of(null))),
    ),
    { initialValue: null as Projeto | null },
  );

  readonly meuProjetoDetalhe = toSignal(
    toObservable(computed(() => this.meuProjetoBase()?.id ?? '')).pipe(
      switchMap((id) => (id ? this.projetoService.detalhe(id) : of(null))),
    ),
    { initialValue: null as ProjetoDetalhe | null },
  );
}
