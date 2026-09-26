import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';

import {
  ItemTimeline,
  Usuario,
  ehEquipeAcademica,
  rotuloCurso,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CursoService } from '../../core/services/curso.service';
import {
  EntregaService,
  MatrizStatus,
} from '../../core/services/entrega.service';
import { ProgramaService } from '../../core/services/programa.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TimelineComponent } from '../aluno/timeline.component';

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
                  @for (i of d.integrantes; track i.rgm) {
                    <li class="integrante">
                      <app-icone nome="usuarios" class="integrante__icone" />
                      @if (i.nome) {
                        <span class="cell-strong">{{ i.nome }}</span>
                      } @else {
                        <span class="cell-strong muted">
                          RGM {{ i.rgm }} (aguardando cadastro)
                        </span>
                      }
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
        <app-timeline [itens]="itensAluno()" />
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

    .card__head-icone {
      --icone-size: 1.125rem;
      color: var(--primary);
    }

  `,
})
export class InicioComponent {
  private readonly auth = inject(AuthService);
  private readonly cursoService = inject(CursoService);
  private readonly programaService = inject(ProgramaService);
  private readonly projetoService = inject(ProjetoService);
  private readonly entregaService = inject(EntregaService);
  private readonly usuarioService = inject(UsuarioService);

  readonly cursoSelecionado = signal('c-eng-noite');
  readonly projetoSelecionado = signal(TODOS);

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });
  private readonly usuarios = toSignal(
    this.usuarioService.listar().pipe(catchError(() => of([] as Usuario[]))),
    { initialValue: [] as Usuario[] },
  );

  private readonly programas = toSignal(this.programaService.listar(), {
    initialValue: [],
  });

  /** Programa (turma) do curso escolhido — pode não existir ainda. */
  private readonly programaSelecionadoId = computed(
    () => this.programas().find((p) => p.cursoId === this.cursoSelecionado())?.id,
  );

  /** Projetos do curso escolhido — é isto que alimenta o segundo select. */
  readonly projetos = toSignal(
    toObservable(this.programaSelecionadoId).pipe(
      switchMap((programaId) =>
        programaId ? this.projetoService.listar(programaId) : of([]),
      ),
    ),
    { initialValue: [] },
  );

  readonly visaoProfessor = computed(() =>
    ehEquipeAcademica(this.auth.perfil()),
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

  
  private readonly projetoDoAluno = toSignal(
    toObservable(computed(() => this.auth.usuario()?.rgm ?? '')).pipe(
      switchMap((rgm) => (rgm ? this.projetoService.doAluno(rgm) : of(null))),
    ),
    { initialValue: null },
  );

  private readonly projetoAlvo = computed(
    () => this.projetoDoAluno()?.id ?? '',
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
}
