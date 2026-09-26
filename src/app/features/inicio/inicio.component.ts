import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';

import {
  ItemTimeline,
  Projeto,
  ehEquipeAcademica,
  rgmDoUsuario,
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
import { IconeComponent } from '../../shared/components/icone.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TimelineComponent } from '../aluno/timeline.component';

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
            <label class="field__label" for="curso">Turma</label>
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
        </div>

        <section class="card card--flush">
          <div class="card__head">
            <app-icone nome="prancheta" class="card__head-icone" />
            <h2 class="section-title">
              Status de entrega por projeto ({{ projetos().length }})
            </h2>
          </div>

          @if (erroProjetos()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erroProjetos() }}</span>
            </p>
          }

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
                @if (carregandoProjetos()) {
                  <tr>
                    <td class="table-empty" [attr.colspan]="matriz().atividades.length + 1">
                      Carregando projetos…
                    </td>
                  </tr>
                } @else {
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
                        @if (programaSelecionadoId()) {
                          Nenhum projeto cadastrado nesta turma.
                        } @else {
                          Nenhum PFC iniciado para esta turma — crie em Gestão de PFC.
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </section>
      } @else {
        <!-- -------------------------- visão aluno -------------------------- -->
        <app-timeline [itens]="itensAluno()" />
      }
    </div>
  `,
  styles: `
    .filtros {
      max-width: 20rem;
    }

    .card__head-icone {
      --icone-size: 1.125rem;
      color: var(--primary);
    }

    .alerta {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 0 1.25rem 1rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      color: var(--destructive);
      background: color-mix(in oklch, var(--destructive) 6%, transparent);
      border: 1px solid color-mix(in oklch, var(--destructive) 30%, transparent);
    }
  `,
})
export class InicioComponent {
  private readonly auth = inject(AuthService);
  private readonly cursoService = inject(CursoService);
  private readonly programaService = inject(ProgramaService);
  private readonly projetoService = inject(ProjetoService);
  private readonly entregaService = inject(EntregaService);

  readonly visaoProfessor = computed(() =>
    ehEquipeAcademica(this.auth.perfil()),
  );

  /* ------------------------------ professor ------------------------------ */

  readonly cursoSelecionado = signal('c-eng-noite');

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });

  private readonly programas = toSignal(
    this.programaService.listar().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  /** Programa (turma) do curso escolhido — pode não existir ainda. */
  readonly programaSelecionadoId = computed(
    () => this.programas().find((p) => p.cursoId === this.cursoSelecionado())?.id,
  );

  readonly carregandoProjetos = signal(false);
  readonly erroProjetos = signal('');

  /** Todos os PFCs reais da turma — cada um vira uma linha da tabela. */
  readonly projetos = toSignal(
    toObservable(this.programaSelecionadoId).pipe(
      tap(() => this.erroProjetos.set('')),
      switchMap((programaId) => {
        if (!programaId) {
          return of([] as Projeto[]);
        }
        this.carregandoProjetos.set(true);
        return this.projetoService.listar(programaId).pipe(
          tap(() => this.carregandoProjetos.set(false)),
          catchError((e: Error) => {
            this.carregandoProjetos.set(false);
            this.erroProjetos.set(e.message);
            return of([] as Projeto[]);
          }),
        );
      }),
    ),
    { initialValue: [] as Projeto[] },
  );

  readonly matriz = toSignal(
    toObservable(this.projetos).pipe(
      switchMap((projetos) => this.entregaService.matrizDosProjetos(projetos)),
    ),
    { initialValue: { atividades: [], linhas: [] } as MatrizStatus },
  );

  /* -------------------------------- aluno -------------------------------- */

  private readonly projetoDoAluno = toSignal(
    toObservable(computed(() => rgmDoUsuario(this.auth.usuario()))).pipe(
      switchMap((rgm) =>
        rgm && !this.visaoProfessor()
          ? this.projetoService.doAluno(rgm).pipe(catchError(() => of(null)))
          : of(null),
      ),
    ),
    { initialValue: null as Projeto | null },
  );

  readonly itensAluno = toSignal(
    toObservable(this.projetoDoAluno).pipe(
      switchMap((p) =>
        p ? this.entregaService.timelineDoProjeto(p.id, p.nome) : of([]),
      ),
    ),
    { initialValue: [] as ItemTimeline[] },
  );

  rotulo = rotuloCurso;

  trocarCurso(evento: Event): void {
    this.cursoSelecionado.set((evento.target as HTMLSelectElement).value);
  }
}
