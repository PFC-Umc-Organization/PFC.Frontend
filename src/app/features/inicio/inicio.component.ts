import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';

import { ItemTimeline, rotuloCurso } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CursoService } from '../../core/services/curso.service';
import {
  EntregaService,
  MatrizStatus,
} from '../../core/services/entrega.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TimelineComponent } from '../aluno/timeline.component';

/** Valor do select que representa "não filtrei por projeto nenhum". */
const TODOS = '';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [TimelineComponent, StatusBadgeComponent, IconeComponent],
  template: `
    <div class="page">
      @if (visaoProfessor()) {
        <!-- ------------------------ visão professor ------------------------ -->
        <div class="filtros">
          <div class="field">
            <label class="field__label" for="curso">Curso</label>
            <select
              id="curso"
              class="control"
              [value]="cursoSelecionado()"
              (change)="trocarCurso($event)"
            >
              @for (c of cursos(); track c.id) {
                <option [value]="c.id">{{ rotulo(c) }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label class="field__label" for="projeto">Projeto</label>
            <select
              id="projeto"
              class="control"
              [value]="projetoSelecionado()"
              (change)="trocarProjeto($event)"
            >
              <option value="">Todos os projetos</option>
              @for (p of projetos(); track p.id) {
                <option [value]="p.id">{{ p.nome }}</option>
              }
            </select>
            @if (projetos().length === 0) {
              <span class="field__hint">
                Nenhum projeto cadastrado neste curso.
              </span>
            }
          </div>
        </div>

        @if (detalhe(); as d) {
          <!-- ------------------- um projeto em foco ------------------- -->
          <section class="card">
            <div class="card__body grupo">
              <div>
                <p class="eyebrow">Projeto</p>
                <h2 class="page-title mt-2">{{ d.projeto.nome }}</h2>
                <p class="lead mt-2">{{ d.projeto.descricao }}</p>
              </div>

              <div class="integrantes">
                <p class="eyebrow">Integrantes do grupo</p>
                <ul class="integrantes__lista mt-2">
                  @for (i of d.integrantes; track i.id) {
                    <li class="integrante">
                      <app-icone nome="usuarios" class="integrante__icone" />
                      <span>
                        <span class="cell-strong">{{ i.nome }}</span>
                        <span class="integrante__email">{{ i.email }}</span>
                      </span>
                    </li>
                  } @empty {
                    <li class="muted text-sm">
                      Nenhum aluno vinculado a este projeto.
                    </li>
                  }
                </ul>
              </div>
            </div>
          </section>

          <app-timeline
            [itens]="itensProjeto()"
            [interativo]="false"
            titulo="Timeline do projeto"
        
          />
        } @else {
          <!-- ------------- visão geral: todos os projetos ------------- -->
          <section class="card card--flush">
            <div class="card__head">
              <app-icone nome="prancheta" class="card__head-icone" />
              <h2 class="section-title">Status de entrega por projeto</h2>
            </div>

            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr>
                    <th scope="col">Projeto</th>
                    @for (a of matriz().atividades; track a.id) {
                      <th scope="col">{{ a.titulo }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (linha of matriz().linhas; track linha.projeto.id) {
                    <tr>
                      <td class="cell-strong">{{ linha.projeto.nome }}</td>
                      @for (c of linha.celulas; track c.atividadeId) {
                        <td><app-status-badge [status]="c.status" /></td>
                      }
                    </tr>
                  } @empty {
                    <tr>
                      <td
                        class="table-empty"
                        [attr.colspan]="matriz().atividades.length + 1"
                      >
                        Nenhum projeto cadastrado neste curso.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      } @else {
        <!-- -------------------------- visão aluno -------------------------- -->
        @if (ehPreviaDoProfessor()) {
          <p class="aviso">
            <app-icone nome="alerta" />
            <span>
              Prévia da visão do aluno
              @if (nomeProjetoPrevia()) {
                — projeto <strong>{{ nomeProjetoPrevia() }}</strong>
              }
              . Como professor, você não pode marcar entregas por aqui.
            </span>
          </p>
        }

        <app-timeline
          [itens]="itensAluno()"
          [interativo]="!ehPreviaDoProfessor()"
          (concluir)="concluirEntregavel($event)"
        />
      }
    </div>
  `,
  styles: `
    .filtros {
      display: grid;
      gap: 1rem;
      grid-template-columns: minmax(0, 1fr);
      max-width: 40rem;
    }

    @media (min-width: 640px) {
      .filtros {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .grupo {
      display: grid;
      gap: 2rem;
    }

    @media (min-width: 768px) {
      .grupo {
        grid-template-columns: 1.2fr 1fr;
        align-items: start;
      }
    }

    .integrantes__lista {
      display: grid;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
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

    .integrante__email {
      display: block;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .card__head-icone {
      --icone-size: 1.125rem;
      color: var(--primary);
    }

    .aviso {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      color: var(--foreground);
      background: color-mix(in oklch, var(--bronze) 8%, transparent);
      border: 1px solid color-mix(in oklch, var(--bronze) 35%, transparent);
    }

    .aviso app-icone {
      color: var(--bronze);
      margin-top: 0.125rem;
    }
  `,
})
export class InicioComponent {
  private readonly auth = inject(AuthService);
  private readonly cursoService = inject(CursoService);
  private readonly projetoService = inject(ProjetoService);
  private readonly entregaService = inject(EntregaService);
  private readonly usuarioService = inject(UsuarioService);

  readonly cursoSelecionado = signal('c-eng-noite');
  readonly projetoSelecionado = signal(TODOS);

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });
  private readonly usuarios = toSignal(this.usuarioService.listar(), {
    initialValue: [],
  });

  /** Projetos do curso escolhido — é isto que alimenta o segundo select. */
  readonly projetos = toSignal(
    toObservable(this.cursoSelecionado).pipe(
      switchMap((cursoId) => this.projetoService.listar(cursoId)),
    ),
    { initialValue: [] },
  );

  readonly visaoProfessor = computed(
    () => this.auth.perfilVisao() === 'PROFESSOR',
  );

  /** Professor olhando a interface do aluno via "Ver como". */
  readonly ehPreviaDoProfessor = computed(
    () => this.auth.ehProfessor() && this.auth.perfilVisao() === 'ALUNO',
  );

  readonly detalhe = toSignal(
    toObservable(this.projetoSelecionado).pipe(
      switchMap((id) => (id ? this.projetoService.detalhe(id) : of(null))),
    ),
    { initialValue: null },
  );

  readonly itensProjeto = toSignal(
    toObservable(this.projetoSelecionado).pipe(
      switchMap((id) =>
        id ? this.entregaService.timelineDoProjeto(id) : of([]),
      ),
    ),
    { initialValue: [] as ItemTimeline[] },
  );

  readonly matriz = toSignal(
    toObservable(this.cursoSelecionado).pipe(
      switchMap((id) => this.entregaService.matrizDoCurso(id)),
    ),
    { initialValue: { atividades: [], linhas: [] } as MatrizStatus },
  );

  /** Projeto do grupo do aluno logado — resolvido pelo service, não pelos filtros. */
  private readonly projetoDoAluno = toSignal(
    toObservable(computed(() => this.auth.usuario()?.id ?? '')).pipe(
      switchMap((id) => (id ? this.projetoService.doAluno(id) : of(null))),
    ),
    { initialValue: null },
  );

  /**
   * Qual projeto a timeline da visão do aluno mostra. Para o aluno é o grupo
   * dele; para o professor em prévia, o projeto que ele filtrou (ou o
   * primeiro do curso, quando está vendo todos).
   */
  private readonly projetoAlvo = computed(() => {
    if (this.ehPreviaDoProfessor()) {
      return this.projetoSelecionado() || (this.projetos()[0]?.id ?? '');
    }

    return this.projetoDoAluno()?.id ?? '';
  });

  readonly nomeProjetoPrevia = computed(
    () => this.projetos().find((p) => p.id === this.projetoAlvo())?.nome ?? '',
  );

  readonly itensAluno = toSignal(
    toObservable(this.projetoAlvo).pipe(
      switchMap((id) =>
        id ? this.entregaService.timelineDoProjeto(id) : of([]),
      ),
    ),
    { initialValue: [] as ItemTimeline[] },
  );

  constructor() {
    /**
     * Trocar de curso invalida o projeto escolhido — ele pertence ao curso
     * anterior. Sem isto, a tela ficaria mostrando um projeto que não está
     * mais na lista do select.
     */
    effect(() => {
      const projetos = this.projetos();
      const atual = this.projetoSelecionado();

      if (atual && !projetos.some((p) => p.id === atual)) {
        this.projetoSelecionado.set(TODOS);
      }
    });
  }

  rotulo = rotuloCurso;

  trocarCurso(evento: Event): void {
    this.cursoSelecionado.set((evento.target as HTMLSelectElement).value);
    this.projetoSelecionado.set(TODOS);
  }

  trocarProjeto(evento: Event): void {
    this.projetoSelecionado.set((evento.target as HTMLSelectElement).value);
  }

  concluirEntregavel(atividadeId: string): void {
    const projetoId = this.projetoAlvo();

    if (!projetoId) {
      return;
    }

    this.entregaService.marcarEntregue(atividadeId, projetoId).subscribe();
  }
}
