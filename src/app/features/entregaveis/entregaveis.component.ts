import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, of, switchMap } from 'rxjs';

import {
  Atividade,
  CampoEntrega,
  Projeto,
  Entrega,
  ItemTimeline,
  EXTENSOES_ARQUIVO,
  ehArquivoGuardado,
  ehEquipeAcademica,
  nomeDoArquivo,
  problemaDoArquivo,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { AtividadeService } from '../../core/services/atividade.service';
import { EntregaService } from '../../core/services/entrega.service';
import { ErroApi } from '../../core/services/http-erro';
import { ProjetoService } from '../../core/services/projeto.service';
import { TimelineComponent } from '../aluno/timeline.component';
import { IconeComponent } from '../../shared/components/icone.component';
import { PrazoPipe } from '../../shared/pipes/prazo.pipe';


@Component({
  selector: 'app-entregaveis',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    RouterLink,
    IconeComponent,
    PrazoPipe,
    TimelineComponent,
    DatePipe,
  ],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Entrega de atividades</p>
        <h1 class="page-title mt-2">Entregáveis</h1>
        <p class="lead mt-2">
          Escolha uma atividade cadastrada pelo professor, preencha os campos do
          formulário e envie a entrega do seu grupo antes do prazo.
        </p>
      </header>

      @if (erroCarga()) {
        <p class="alerta" role="alert">
          <app-icone nome="alerta" />
          <span>Não foi possível carregar as entregas: {{ erroCarga() }}</span>
        </p>
      }

      <section class="card">
        <div class="card__body">
          <h2 class="section-title">Enviar entrega</h2>

          @if (!projetoDoAluno()) {
            <p class="vazio mt-6">
              Você ainda não faz parte de um PFC, e a entrega é feita pelo grupo.
              <a routerLink="/meu-pfc">Crie o PFC ou aceite um convite</a>.
            </p>
          } @else if (disponiveis().length === 0) {
            <p class="vazio mt-6">
              Nenhuma atividade aberta para entrega: os prazos das que faltam
              encerraram.
            </p>
          } @else {
            <div class="form-grid form-grid--2 mt-6">
              <div class="field">
                <label class="field__label" for="atividade">Atividade</label>
                <select
                  id="atividade"
                  class="control"
                  [value]="atividadeSelecionada()"
                  (change)="aoTrocarAtividade($event)"
                >
                  <option value="" [selected]="!atividadeSelecionada()">Selecione…</option>
                  @for (item of disponiveis(); track item.atividadeId) {
                    <option
                      [value]="item.atividadeId"
                      [selected]="item.atividadeId === atividadeSelecionada()"
                    >
                      {{ item.titulo }} — entrega até {{ item.prazo | prazo }}
                      @if (item.status !== 'PENDENTE') {
                        (já entregue — editar)
                      }
                    </option>
                  }
                </select>
              </div>

              @for (campo of camposDaAtividade(); track campo.id) {
                <div
                  class="field"
                  [class.form-grid__full]="campo.tipo === 'TEXTO_LONGO'"
                >
                  <label class="field__label" [attr.for]="'campo-' + campo.id">
                    {{ campo.rotulo }}
                    @if (!campo.obrigatorio) {
                      <span class="campo-opcional">(opcional)</span>
                    }
                  </label>

                  @switch (campo.tipo) {
                    @case ('ARQUIVO') {
                      <div class="upload">
                        <label
                          [attr.for]="'campo-' + campo.id"
                          class="btn btn--outline"
                          [class.btn--disabled]="progresso()[campo.id] !== undefined"
                        >
                          {{ respostas()[campo.id] ? 'Trocar arquivo' : 'Escolher arquivo' }}
                        </label>
                        <span class="upload__nome" aria-live="polite">
                          @if (progresso()[campo.id] !== undefined) {
                            Enviando… {{ progresso()[campo.id] }}%
                          } @else {
                            {{ nomeArquivo(respostas()[campo.id]) || 'Nenhum arquivo selecionado' }}
                          }
                        </span>
                      </div>
                      @if (progresso()[campo.id] !== undefined) {
                        <progress class="upload__barra" max="100" [value]="progresso()[campo.id]"></progress>
                      }
                      <span class="field__hint">PDF, Office/LibreOffice, imagem, ZIP ou texto, até 50 MB.</span>
                      @if (erroArquivo()[campo.id]) {
                        <span class="field__error" role="alert">{{ erroArquivo()[campo.id] }}</span>
                      }
                      <input
                        [id]="'campo-' + campo.id"
                        type="file"
                        class="upload__input"
                        [accept]="extensoes"
                        [disabled]="progresso()[campo.id] !== undefined"
                        (change)="aoSelecionarArquivo(campo.id, $event)"
                      />
                    }
                    @case ('TEXTO_LONGO') {
                      <textarea
                        [id]="'campo-' + campo.id"
                        class="control control--textarea"
                        [value]="respostas()[campo.id] ?? ''"
                        (input)="aoDigitar(campo.id, $event)"
                      ></textarea>
                    }
                    @case ('LINK') {
                      <input
                        [id]="'campo-' + campo.id"
                        class="control"
                        type="url"
                        placeholder="https://"
                        [value]="respostas()[campo.id] ?? ''"
                        (input)="aoDigitar(campo.id, $event)"
                      />
                    }
                    @default {
                      <input
                        [id]="'campo-' + campo.id"
                        class="control"
                        type="text"
                        [value]="respostas()[campo.id] ?? ''"
                        (input)="aoDigitar(campo.id, $event)"
                      />
                    }
                  }
                </div>
              }

              <div class="form-grid__full">
                <button
                  type="button"
                  class="btn btn--primary"
                  [disabled]="!podeEnviar()"
                  (click)="enviarEntrega()"
                >
                  <app-icone nome="mais" class="btn__icon" />
                  {{ editando() ? 'Salvar alterações' : 'Enviar entrega' }}
                </button>
                @if (mensagem()) {
                  <p class="confirmacao">{{ mensagem() }}</p>
                }
                @if (erroEntrega()) {
                  <p class="confirmacao confirmacao--erro">{{ erroEntrega() }}</p>
                }
              </div>
            </div>
          }
        </div>
      </section>

      @if (minhasEntregas().length > 0) {
        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Suas entregas</h2>
            <p class="lead mt-2">
              O que o seu grupo enviou. Entregue no prazo, dá para editar depois;
              sem entrega, o prazo encerra a atividade.
            </p>
            @if (erroDownload()) {
              <p class="alerta mt-4" role="alert">
                <app-icone nome="alerta" />
                <span>{{ erroDownload() }}</span>
              </p>
            }

            @for (m of minhasEntregas(); track m.atividade.id) {
              <article class="entrega mt-6">
                <header class="entrega__topo">
                  <div>
                    <h3 class="entrega__titulo">{{ m.atividade.titulo }}</h3>
                    <p class="entrega__sub">
                      Enviada em {{ m.entrega.entregueEm | date: 'dd/MM/yyyy HH:mm' }}
                      @if (m.entrega.entreguePor) {
                        por {{ m.entrega.entreguePor }}
                      }
                      @if (m.entrega.atualizadaEm) {
                        · editada em {{ m.entrega.atualizadaEm | date: 'dd/MM/yyyy HH:mm' }}
                        @if (m.entrega.atualizadaPor) {
                          por {{ m.entrega.atualizadaPor }}
                        }
                      }
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn btn--outline btn--sm"
                    (click)="editar(m.atividade.id)"
                  >
                    Editar
                  </button>
                </header>
                <dl class="entrega__lista">
                  @for (l of m.linhas; track l.rotulo) {
                    <dt>{{ l.rotulo }}</dt>
                    <dd>
                      @if (!l.valor) {
                        <span class="entrega__sub">não preenchido</span>
                      } @else if (l.tipo === 'ARQUIVO' && guardado(l.valor)) {
                        <button
                          type="button"
                          class="link-botao"
                          (click)="baixar(m.atividade.id, l.campoId)"
                        >
                          <app-icone nome="download" />
                          {{ nomeArquivo(l.valor) }}
                        </button>
                      } @else if (l.tipo === 'ARQUIVO') {
                        {{ nomeArquivo(l.valor) }}
                        <span class="entrega__sub">(enviado antes do upload — só o nome)</span>
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
              </article>
            }
          </div>
        </section>
      }

      <app-timeline
        [itens]="itensEntregaveis()"
        [interativo]="false"
        [mostrarLegenda]="false"
        titulo="Entregas"
        sobretitulo=""
        descricao=""
      />
    </div>
  `,
  styles: `
    .entrega {
      padding: 1rem;
      border: 1px solid var(--border);
    }

    .entrega__topo {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .entrega__titulo {
      font-size: 1rem;
      font-weight: 700;
      color: var(--primary);
    }

    .entrega__sub {
      margin: 0.125rem 0 0;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .entrega__lista {
      display: grid;
      grid-template-columns: minmax(8rem, 14rem) 1fr;
      gap: 0.5rem 1rem;
      margin: 0.75rem 0 0;
    }

    .entrega__lista dt {
      font-weight: 700;
      font-size: 0.8125rem;
    }

    .entrega__lista dd {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .campo-opcional {
      font-weight: 400;
      color: var(--muted-foreground);
    }

    .confirmacao--erro {
      color: var(--destructive);
    }

    .vazio {
      padding: 2.5rem 1.25rem;
      text-align: center;
      color: var(--muted-foreground);
      background: var(--card);
      border: 1px dashed color-mix(in oklch, var(--primary) 20%, transparent);
    }

    .confirmacao {
      margin-top: 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--success);
    }

    .upload {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      height: 2.75rem;
    }

    .upload__barra {
      width: 100%;
      height: 0.375rem;
      accent-color: var(--primary);
    }

    .btn--disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .upload__nome {
      overflow: hidden;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Some visualmente, mas continua acessível: o <label for> abre o seletor
       de arquivo e o foco do teclado ainda alcança o input. */
    .upload__input {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class EntregaveisComponent {
  private readonly projetoService = inject(ProjetoService);
  private readonly entregaService = inject(EntregaService);
  private readonly atividadeService = inject(AtividadeService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  /** Falha ao ler projeto, atividades ou entregas — no lugar de listas vazias enganosas. */
  readonly erroCarga = signal('');

  private semErro<T>(vazio: T) {
    return (fonte: Observable<T>) =>
      fonte.pipe(
        catchError((e: Error) => {
          this.erroCarga.set(e.message);
          return of(vazio);
        }),
      );
  }
  /** Projeto do grupo do aluno logado; a equipe acadêmica não tem grupo. */
  readonly projetoDoAluno = toSignal(
    toObservable(computed(() => !ehEquipeAcademica(this.auth.perfil()))).pipe(
      switchMap((aluno) => (aluno ? this.projetoService.meuProjeto() : of(null))),
      this.semErro<Projeto | null>(null),
    ),
    { initialValue: null as Projeto | null },
  );

  /** Qual projeto a tela mostra: o grupo do aluno logado. */
  private readonly projetoAlvoId = computed(
    () => this.projetoDoAluno()?.id ?? '',
  );

  readonly itensEntregaveis = toSignal(
    toObservable(this.projetoDoAluno).pipe(
      switchMap((p) =>
        p ? this.entregaService.timelineDoProjeto(p.id, p.nome) : of([]),
      ),
      this.semErro([] as ItemTimeline[]),
    ),
    { initialValue: [] as ItemTimeline[] },
  );

  private readonly atividadesDaTurma = toSignal(
    this.atividadeService.listar().pipe(this.semErro([] as Atividade[])),
    { initialValue: [] as Atividade[] },
  );

  /** Entregas do grupo, com as respostas (atualiza a cada envio). */
  private readonly entregasDoGrupo = toSignal(
    toObservable(this.projetoDoAluno).pipe(
      switchMap((p) =>
        p ? this.entregaService.entregasDoProjeto(p.id) : of([] as Entrega[]),
      ),
      this.semErro([] as Entrega[]),
    ),
    { initialValue: [] as Entrega[] },
  );

  /** Entra na seleção o que falta entregar no prazo e o que já foi entregue (editável sempre). */
  readonly disponiveis = computed(() =>
    this.itensEntregaveis().filter((item) => item.status !== 'ATRASADO'),
  );

  /** Entregas já feitas, com cada resposta ao lado do nome do campo. */
  readonly minhasEntregas = computed(() =>
    this.entregasDoGrupo()
      .map((entrega) => {
        const atividade = this.atividadesDaTurma().find(
          (a) => a.id === entrega.atividadeId,
        );
        if (!atividade) {
          return null;
        }
        return {
          atividade,
          entrega,
          linhas: atividade.campos.map((c) => ({
            campoId: c.id,
            rotulo: c.rotulo,
            tipo: c.tipo,
            valor: entrega.respostas?.[c.id] ?? '',
          })),
        };
      })
      .filter((m) => m !== null)
      .sort((a, b) => a.atividade.prazo.localeCompare(b.atividade.prazo)),
  );

  /** A atividade escolhida já tem entrega — o envio vira uma edição. */
  readonly editando = computed(() =>
    this.entregasDoGrupo().some(
      (e) => e.atividadeId === this.atividadeSelecionada(),
    ),
  );

  readonly atividadeSelecionada = signal('');
  /** Resposta de cada campo, por id (campo de arquivo guarda o nome). */
  readonly respostas = signal<Record<string, string | undefined>>({});
  readonly enviando = signal(false);
  readonly mensagem = signal('');
  readonly erroEntrega = signal('');

  private readonly atividades = this.atividadesDaTurma;

  /** Campos do formulário da atividade escolhida. */
  readonly camposDaAtividade = computed<CampoEntrega[]>(
    () =>
      this.atividades().find((a) => a.id === this.atividadeSelecionada())
        ?.campos ?? [],
  );

  /** Percentual do upload em andamento, por campo. */
  readonly progresso = signal<Record<string, number | undefined>>({});
  readonly erroArquivo = signal<Record<string, string>>({});
  readonly extensoes = EXTENSOES_ARQUIVO.join(',');
  readonly nomeArquivo = (resposta: string | undefined) => (resposta ? nomeDoArquivo(resposta) : '');
  readonly guardado = ehArquivoGuardado;

  readonly podeEnviar = computed(() => {
    const campos = this.camposDaAtividade();
    const respostas = this.respostas();
    return (
      !!this.atividadeSelecionada() &&
      campos.length > 0 &&
      campos.every((c) => !c.obrigatorio || !!respostas[c.id]?.trim()) &&
      Object.values(this.progresso()).every((p) => p === undefined) &&
      !this.enviando()
    );
  });

  constructor() {
    const inicial = this.route.snapshot.queryParamMap.get('atividade');

    if (inicial) {
      // Só na chegada: depois de enviar, o formulário volta vazio.
      const aplicar = effect(() => {
        if (this.disponiveis().some((item) => item.atividadeId === inicial)) {
          untracked(() => this.escolherAtividade(inicial));
          aplicar.destroy();
        }
      });
    }
  }

  aoTrocarAtividade(evento: Event): void {
    this.escolherAtividade((evento.target as HTMLSelectElement).value);
  }

  /** Escolhe a atividade; se já foi entregue, preenche com o que foi enviado. */
  private escolherAtividade(atividadeId: string): void {
    const entrega = this.entregasDoGrupo().find(
      (e) => e.atividadeId === atividadeId,
    );
    this.atividadeSelecionada.set(atividadeId);
    this.respostas.set({ ...(entrega?.respostas ?? {}) });
    this.erroArquivo.set({});
    this.mensagem.set('');
    this.erroEntrega.set('');
  }

  /** Botão "Editar" da lista de entregas: carrega no formulário lá em cima. */
  editar(atividadeId: string): void {
    this.escolherAtividade(atividadeId);
    document.getElementById('atividade')?.scrollIntoView({ behavior: 'smooth' });
  }

  aoDigitar(campoId: string, evento: Event): void {
    const valor = (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.respostas.update((r) => ({ ...r, [campoId]: valor }));
  }

  /**
   * O arquivo sobe na hora, direto para o bucket; a entrega só muda quando o
   * grupo clica em enviar. Sem bucket no backend (503), segue só o nome.
   */
  aoSelecionarArquivo(campoId: string, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    const projetoId = this.projetoAlvoId();
    const atividadeId = this.atividadeSelecionada();
    if (!arquivo || !projetoId || !atividadeId) {
      return;
    }
    const problema = problemaDoArquivo(arquivo);
    this.erroArquivo.update((e) => ({ ...e, [campoId]: problema }));
    if (problema) {
      return;
    }
    this.mensagem.set('');
    this.progresso.update((p) => ({ ...p, [campoId]: 0 }));
    const fim = () => this.progresso.update((p) => ({ ...p, [campoId]: undefined }));
    this.entregaService.enviarArquivo(projetoId, atividadeId, campoId, arquivo).subscribe({
      next: (ev) => {
        if (ev.tipo === 'progresso') {
          this.progresso.update((p) => ({ ...p, [campoId]: ev.percentual }));
        } else {
          this.respostas.update((r) => ({ ...r, [campoId]: ev.chave }));
          fim();
        }
      },
      error: (e: ErroApi) => {
        fim();
        if (e.status === 503) {
          this.respostas.update((r) => ({ ...r, [campoId]: arquivo.name }));
          return;
        }
        this.erroArquivo.update((er) => ({ ...er, [campoId]: e.message }));
      },
    });
  }

  readonly erroDownload = signal('');

  baixar(atividadeId: string, campoId: string): void {
    const projetoId = this.projetoAlvoId();
    if (!projetoId) {
      return;
    }
    this.erroDownload.set('');
    this.entregaService.linkDoArquivo(projetoId, atividadeId, campoId).subscribe({
      next: ({ url }) => window.location.assign(url),
      error: (e: Error) => this.erroDownload.set(e.message),
    });
  }

  enviarEntrega(): void {
    const atividadeId = this.atividadeSelecionada();
    const projetoId = this.projetoAlvoId();

    if (!atividadeId || !projetoId || !this.podeEnviar()) {
      return;
    }

    this.enviando.set(true);
    this.erroEntrega.set('');

    const respostas = Object.fromEntries(
      Object.entries(this.respostas()).filter(
        (par): par is [string, string] => !!par[1],
      ),
    );

    this.entregaService
      .entregar(atividadeId, projetoId, respostas)
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.mensagem.set(
            this.editando() ? 'Entrega atualizada.' : 'Entrega enviada com sucesso.',
          );
          this.atividadeSelecionada.set('');
          this.respostas.set({});
        },
        error: (e: Error) => {
          this.enviando.set(false);
          this.erroEntrega.set(e.message);
        },
      });
  }
}
