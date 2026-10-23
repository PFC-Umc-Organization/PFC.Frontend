import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';

import {
  Entrega,
  TipoCampoEntrega,
  ehArquivoGuardado,
  ehDoPeriodo,
  nomeDoArquivo,
  periodoAtual,
  rotuloTurma,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { CursoService } from '../../core/services/curso.service';
import { EntregaService, MatrizStatus } from '../../core/services/entrega.service';
import { ProgramaService } from '../../core/services/programa.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

const MATRIZ_VAZIA: MatrizStatus = { atividades: [], linhas: [], entregas: [] };

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
          Status de entrega por projeto ({{ matriz().linhas.length }})
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
            @if (carregando()) {
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
                      @if (souOrientador()) {
                        Nenhum projeto desta turma tem você como orientador.
                      } @else {
                        Nenhum projeto cadastrado nesta turma.
                      }
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
                  } @else if (l.tipo === 'ARQUIVO' && guardado(l.valor)) {
                    <button
                      type="button"
                      class="link-botao"
                      (click)="baixar(d.projetoId, d.atividadeId, l.campoId)"
                    >
                      <app-icone nome="download" />
                      {{ nomeArquivo(l.valor) }}
                    </button>
                  } @else if (l.tipo === 'ARQUIVO') {
                    {{ l.valor }}
                    <span class="detalhe__vazio">(só o nome — enviado antes do upload)</span>
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
            @if (erroDownload()) {
              <p class="alerta alerta--solto" role="alert">{{ erroDownload() }}</p>
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
  private readonly entregaService = inject(EntregaService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly auth = inject(AuthService);

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

  readonly souOrientador = computed(() => this.auth.usuario()?.perfil === 'ORIENTADOR');

  readonly carregando = signal(false);
  readonly erroProjetos = signal('');

  /** Projetos, atividades e entregas da turma — cada projeto vira uma linha. */
  readonly matriz = toSignal(
    toObservable(this.programaSelecionadoId).pipe(
      tap(() => this.erroProjetos.set('')),
      switchMap((programaId) => {
        if (!programaId) {
          return of(MATRIZ_VAZIA);
        }
        this.carregando.set(true);
        return this.entregaService.matriz(programaId).pipe(
          tap(() => this.carregando.set(false)),
          catchError((e: Error) => {
            this.carregando.set(false);
            this.erroProjetos.set(e.message);
            return of(MATRIZ_VAZIA);
          }),
        );
      }),
    ),
    { initialValue: MATRIZ_VAZIA },
  );

  /** Célula da matriz aberta no painel de detalhe. */
  readonly selecionada = signal<{
    projetoId: string;
    projetoNome: string;
    atividadeId: string;
  } | null>(null);
  readonly erroRemocao = signal('');

  /** O que o grupo respondeu em cada campo da atividade escolhida. */
  readonly detalhe = computed(() => {
    const sel = this.selecionada();
    if (!sel) {
      return null;
    }
    const { atividades, entregas } = this.matriz();
    const atividade = atividades.find((a) => a.id === sel.atividadeId);
    if (!atividade) {
      return null;
    }
    const entrega: Entrega | null =
      entregas.find(
        (e) => e.projetoId === sel.projetoId && e.atividadeId === sel.atividadeId,
      ) ?? null;
    return {
      ...sel,
      atividade,
      entrega,
      linhas: atividade.campos.map((c) => ({
        campoId: c.id,
        rotulo: c.rotulo,
        tipo: c.tipo as TipoCampoEntrega,
        valor: entrega?.respostas?.[c.id] ?? '',
      })),
    };
  });

  readonly guardado = ehArquivoGuardado;
  readonly nomeArquivo = nomeDoArquivo;
  readonly erroDownload = signal('');

  baixar(projetoId: string, atividadeId: string, campoId: string): void {
    this.erroDownload.set('');
    this.entregaService.linkDoArquivo(projetoId, atividadeId, campoId).subscribe({
      next: ({ url }) => window.location.assign(url),
      error: (e: Error) => this.erroDownload.set(e.message),
    });
  }

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
