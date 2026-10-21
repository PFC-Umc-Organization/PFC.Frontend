import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, switchMap, tap } from 'rxjs';

import {
  Entrega,
  Projeto,
  TipoCampoEntrega,
  ehDoPeriodo,
  periodoAtual,
  rotuloTurma,
} from '../../core/models';
import { AtividadeService } from '../../core/services/atividade.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { CursoService } from '../../core/services/curso.service';
import { EntregaService, MatrizStatus } from '../../core/services/entrega.service';
import { ProgramaService } from '../../core/services/programa.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

/** Painel da equipe acadêmica: entregas de cada grupo da turma. */
@Component({
  selector: 'app-painel-equipe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [StatusBadgeComponent, IconeComponent, DatePipe],
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">Acompanhamento</p>
        <h1 class="page-title mt-2">Painel do PFC</h1>
        <p class="lead mt-2">
          Entregas de cada grupo da turma, atividade por atividade.
        </p>
      </div>
      <div class="field filtros">
        <label class="field__label" for="curso">Turma</label>
        <select
          id="curso"
          class="control"
          [value]="cursoSelecionado()"
          (change)="trocarCurso($event)"
        >
          @for (c of cursos(); track c.id) {
            <option [value]="c.id" [selected]="c.id === cursoSelecionado()">{{ rotulo(c) }}</option>
          }
        </select>
      </div>
    </header>

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
                    <td>
                      <button
                        type="button"
                        class="celula"
                        [class.celula--ativa]="
                          selecionada()?.projetoId === linha.projeto.id &&
                          selecionada()?.atividadeId === c.atividadeId
                        "
                        (click)="abrir(linha.projeto.id, linha.projeto.nome, c.atividadeId)"
                        [attr.aria-label]="'Ver entrega de ' + linha.projeto.nome"
                      >
                        <app-status-badge [status]="c.status" />
                      </button>
                    </td>
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

    @if (detalhe(); as d) {
      <section class="card" aria-live="polite">
        <div class="card__body">
          <div class="detalhe__topo">
            <div>
              <h2 class="section-title">{{ d.atividade.titulo }}</h2>
              <p class="detalhe__sub">Projeto {{ d.projetoNome }}</p>
            </div>
            <button
              type="button"
              class="btn btn--outline btn--sm"
              (click)="fechar()"
            >
              Fechar
            </button>
          </div>

          @if (d.entrega; as e) {
            <p class="detalhe__sub">
              Entregue em {{ e.entregueEm | date: 'dd/MM/yyyy HH:mm' }}
              @if (e.entreguePor) {
                por {{ e.entreguePor }}
              }
            </p>
            <dl class="detalhe__lista">
              @for (l of d.linhas; track l.rotulo) {
                <dt>{{ l.rotulo }}</dt>
                <dd>
                  @if (!l.valor) {
                    <span class="detalhe__vazio">não preenchido</span>
                  } @else if (l.tipo === 'LINK') {
                    <a [href]="l.valor" target="_blank" rel="noopener noreferrer">
                      {{ l.valor }}
                    </a>
                  } @else {
                    {{ l.valor }}
                  }
                </dd>
              }
            </dl>
            @if (erroRemocao()) {
              <p class="alerta alerta--solto" role="alert">{{ erroRemocao() }}</p>
            }
            <button
              type="button"
              class="btn btn--outline btn--sm"
              (click)="removerEntrega(d.projetoId, d.projetoNome, d.atividade.id)"
            >
              <app-icone nome="lixeira" class="btn__icon" />
              Remover entrega (devolver ao grupo)
            </button>
          } @else {
            <p class="detalhe__sub">Este grupo ainda não entregou esta atividade.</p>
          }
        </div>
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 2.5rem;
    }

    .filtros {
      width: 100%;
      max-width: 20rem;
    }

    .celula {
      padding: 0;
      background: none;
      border: 1px solid transparent;
      cursor: pointer;
    }

    .celula:hover,
    .celula--ativa {
      border-color: var(--primary);
    }

    .detalhe__topo {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .detalhe__sub {
      margin: 0.25rem 0 0.75rem;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
    }

    .detalhe__lista {
      display: grid;
      grid-template-columns: minmax(8rem, 14rem) 1fr;
      gap: 0.5rem 1rem;
      margin: 0 0 1rem;
    }

    .detalhe__lista dt {
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .detalhe__lista dd {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .detalhe__vazio {
      color: var(--muted-foreground);
      font-style: italic;
    }

    .alerta--solto {
      margin: 0 0 0.75rem;
    }

    .alerta {
      margin: 0 1.25rem 1rem;
    }
  `,
})
export class PainelEquipeComponent {
  private readonly cursoService = inject(CursoService);
  private readonly programaService = inject(ProgramaService);
  private readonly projetoService = inject(ProjetoService);
  private readonly entregaService = inject(EntregaService);
  private readonly atividadeService = inject(AtividadeService);
  private readonly confirmacao = inject(ConfirmacaoService);

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });

  private readonly escolhida = signal<string | null>(null);

  /** A turma escolhida ou, de início, a primeira do semestre atual. */
  readonly cursoSelecionado = computed(() => {
    const cursos = this.cursos();
    const escolhida = this.escolhida();
    if (escolhida && cursos.some((c) => c.id === escolhida)) {
      return escolhida;
    }
    const atual = periodoAtual();
    return (cursos.find((c) => ehDoPeriodo(c, atual)) ?? cursos[0])?.id ?? '';
  });

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
      switchMap((projetos) =>
        this.entregaService.matrizDosProjetos(projetos).pipe(
          catchError((e: Error) => {
            this.erroProjetos.set(e.message);
            return of({ atividades: [], linhas: [] } as MatrizStatus);
          }),
        ),
      ),
    ),
    { initialValue: { atividades: [], linhas: [] } as MatrizStatus },
  );

  /** Célula da matriz aberta no painel de detalhe. */
  readonly selecionada = signal<{
    projetoId: string;
    projetoNome: string;
    atividadeId: string;
  } | null>(null);
  readonly erroRemocao = signal('');

  /** O que o grupo respondeu em cada campo da atividade escolhida. */
  readonly detalhe = toSignal(
    toObservable(this.selecionada).pipe(
      switchMap((sel) =>
        sel
          ? combineLatest([
              this.atividadeService.listar(),
              this.entregaService.entregasDoProjeto(sel.projetoId),
            ]).pipe(
              map(([atividades, entregas]) => {
                const atividade = atividades.find((a) => a.id === sel.atividadeId);
                if (!atividade) {
                  return null;
                }
                const entrega: Entrega | null =
                  entregas.find((e) => e.atividadeId === sel.atividadeId) ?? null;
                return {
                  ...sel,
                  atividade,
                  entrega,
                  linhas: atividade.campos.map((c) => ({
                    rotulo: c.rotulo,
                    tipo: c.tipo as TipoCampoEntrega,
                    valor: entrega?.respostas?.[c.id] ?? '',
                  })),
                };
              }),
            )
          : of(null),
      ),
    ),
    { initialValue: null },
  );

  abrir(projetoId: string, projetoNome: string, atividadeId: string): void {
    this.erroRemocao.set('');
    this.selecionada.set({ projetoId, projetoNome, atividadeId });
  }

  fechar(): void {
    this.selecionada.set(null);
  }

  async removerEntrega(
    projetoId: string,
    projetoNome: string,
    atividadeId: string,
  ): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Remover entrega',
      mensagem: `Remover a entrega do projeto "${projetoNome}"? O grupo poderá entregar de novo.`,
      textoConfirmar: 'Remover',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }
    this.erroRemocao.set('');
    this.entregaService.remover(projetoId, atividadeId).subscribe({
      error: (e: Error) => this.erroRemocao.set(e.message),
    });
  }

  rotulo = rotuloTurma;

  trocarCurso(evento: Event): void {
    this.escolhida.set((evento.target as HTMLSelectElement).value);
  }
}
