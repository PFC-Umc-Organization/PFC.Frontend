import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, switchMap } from 'rxjs';

import {
  Atividade,
  CampoEntrega,
  Entrega,
  ItemTimeline,
  Material,
  ROTULO_TIPO_MATERIAL,
  TipoMaterial,
  ehEquipeAcademica,
  rgmDoUsuario,
  rotuloCurso,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { CursoService } from '../../core/services/curso.service';
import { AtividadeService } from '../../core/services/atividade.service';
import { EntregaService } from '../../core/services/entrega.service';
import { MaterialService } from '../../core/services/material.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { TimelineComponent } from '../aluno/timeline.component';
import { IconeComponent } from '../../shared/components/icone.component';
import { PrazoPipe } from '../../shared/pipes/prazo.pipe';


@Component({
  selector: 'app-materiais',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconeComponent,
    PrazoPipe,
    TimelineComponent,
    DatePipe,
  ],
  template: `
    <div class="page">
      @if (visaoProfessor()) {
        <!-- ------------------------ visão professor ------------------------ -->
        <header>
          <p class="eyebrow">Apoio ao PFC</p>
          <h1 class="page-title mt-2">Materiais de Apoio</h1>
          <p class="lead mt-2">
            Modelos, guias e gravações publicados pela coordenação. Materiais
            sem curso valem para todos.
          </p>
        </header>

        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Publicar material</h2>

            <form
              class="form-grid form-grid--2 mt-6"
              [formGroup]="form"
              (ngSubmit)="publicar()"
            >
              <div class="field">
                <label class="field__label" for="titulo">Título</label>
                <input
                  id="titulo"
                  type="text"
                  class="control"
                  placeholder="Ex.: Modelo oficial de PFC"
                  formControlName="titulo"
                />
              </div>

              <div class="field">
                <label class="field__label" for="tipo">Tipo</label>
                <select id="tipo" class="control" formControlName="tipo">
                  @for (t of tipos; track t) {
                    <option [value]="t">{{ rotuloTipo(t) }}</option>
                  }
                </select>
              </div>

              <div class="field">
                <label class="field__label" for="url">Link</label>
                <input
                  id="url"
                  type="url"
                  class="control"
                  placeholder="https://…"
                  formControlName="url"
                />
              </div>

              <div class="field">
                <label class="field__label" for="curso">Curso</label>
                <select id="curso" class="control" formControlName="cursoId">
                  <option value="">Todos os cursos</option>
                  @for (c of cursos(); track c.id) {
                    <option [value]="c.id">{{ rotulo(c) }}</option>
                  }
                </select>
              </div>

              <div class="field form-grid__full">
                <label class="field__label" for="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  class="control control--textarea"
                  placeholder="Para que serve e como usar."
                  formControlName="descricao"
                ></textarea>
              </div>

              <div class="form-grid__full">
                <button type="submit" class="btn btn--primary">
                  <app-icone nome="mais" class="btn__icon" />
                  Publicar material
                </button>
              </div>
            </form>
          </div>
        </section>

        <div class="grade">
          @for (m of materiais(); track m.id) {
            <article class="material">
              <div class="material__topo">
                <span class="badge badge--primary">{{ rotuloTipo(m.tipo) }}</span>
                <button
                  type="button"
                  class="material__remover"
                  (click)="remover(m.id, m.titulo)"
                  [attr.aria-label]="'Remover ' + m.titulo"
                >
                  <app-icone nome="lixeira" />
                </button>
              </div>

              <h3 class="material__titulo">{{ m.titulo }}</h3>
              <p class="material__desc">{{ m.descricao }}</p>

              <footer class="material__base">
                <span class="text-xs muted">
                  Publicado em {{ m.publicadoEm | prazo: true }}
                </span>
                <a
                  class="material__link"
                  [href]="m.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir
                  <app-icone nome="link-externo" />
                </a>
              </footer>
            </article>
          } @empty {
            <p class="vazio">Nenhum material publicado ainda.</p>
          }
        </div>
      } @else {
        <!-- -------------------------- visão aluno -------------------------- -->
        <header>
          <p class="eyebrow">Entrega de atividades</p>
          <h1 class="page-title mt-2">Entregáveis</h1>
          <p class="lead mt-2">
            Escolha uma atividade cadastrada pelo professor, preencha os campos do
            formulário e envie a entrega do seu grupo antes do prazo.
          </p>
        </header>

        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Enviar entrega</h2>

            @if (disponiveis().length === 0) {
              <p class="vazio mt-6">
                Nenhuma atividade disponível para entrega no momento.
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
                    <option value="">Selecione…</option>
                    @for (item of disponiveis(); track item.atividadeId) {
                      <option [value]="item.atividadeId">
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
                          <label [attr.for]="'campo-' + campo.id" class="btn btn--outline">
                            Escolher arquivo
                          </label>
                          <span class="upload__nome">
                            {{ respostas()[campo.id] || 'Nenhum arquivo selecionado' }}
                          </span>
                        </div>
                        <input
                          [id]="'campo-' + campo.id"
                          type="file"
                          class="upload__input"
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
                O que o seu grupo enviou. Dá para editar até o prazo da atividade.
              </p>

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
                      </p>
                    </div>
                    @if (m.podeEditar) {
                      <button
                        type="button"
                        class="btn btn--outline btn--sm"
                        (click)="editar(m.atividade.id)"
                      >
                        Editar
                      </button>
                    } @else {
                      <span class="entrega__sub">Prazo encerrado</span>
                    }
                  </header>
                  <dl class="entrega__lista">
                    @for (l of m.linhas; track l.rotulo) {
                      <dt>{{ l.rotulo }}</dt>
                      <dd>
                        @if (!l.valor) {
                          <span class="entrega__sub">não preenchido</span>
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
      }
    </div>
  `,
  styles: `
    .grade {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    }

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

    .material {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.25rem;
      background: var(--card);
      border: 1px solid color-mix(in oklch, var(--primary) 15%, transparent);
    }

    .material__topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .material__remover {
      display: inline-flex;
      padding: 0.25rem;
      color: var(--muted-foreground);
    }

    .material__remover:hover {
      color: var(--destructive);
    }

    .material__titulo {
      font-size: 1.0625rem;
      color: var(--primary);
    }

    .material__desc {
      flex: 1;
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    .material__base {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }

    .material__link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary);
      text-decoration: none;
    }

    .material__link:hover {
      text-decoration: underline;
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
export class MateriaisComponent {
  private readonly fb = inject(FormBuilder);
  private readonly materialService = inject(MaterialService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly cursoService = inject(CursoService);
  private readonly projetoService = inject(ProjetoService);
  private readonly entregaService = inject(EntregaService);
  private readonly atividadeService = inject(AtividadeService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly tipos: TipoMaterial[] = ['MODELO', 'DOCUMENTO', 'VIDEO', 'LINK'];

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });
  readonly materiais = toSignal(this.materialService.listar(), {
    initialValue: [] as Material[],
  });

  readonly visaoProfessor = computed(() =>
    ehEquipeAcademica(this.auth.perfil()),
  );
  readonly salvando = signal(false);

  readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    descricao: [''],
    tipo: ['MODELO' as TipoMaterial, [Validators.required]],
    url: ['', [Validators.required]],
    cursoId: [''],
  });

  /** Projeto do grupo do aluno logado, resolvido pelo RGM dele. */
  private readonly projetoDoAluno = toSignal(
    toObservable(computed(() => rgmDoUsuario(this.auth.usuario()))).pipe(
      switchMap((rgm) => (rgm ? this.projetoService.doAluno(rgm) : of(null))),
    ),
    { initialValue: null },
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
    ),
    { initialValue: [] as ItemTimeline[] },
  );

  private readonly atividadesDaTurma = toSignal(this.atividadeService.listar(), {
    initialValue: [] as Atividade[],
  });

  /** Entregas do grupo, com as respostas (atualiza a cada envio). */
  private readonly entregasDoGrupo = toSignal(
    toObservable(this.projetoDoAluno).pipe(
      switchMap((p) =>
        p ? this.entregaService.entregasDoProjeto(p.id) : of([] as Entrega[]),
      ),
    ),
    { initialValue: [] as Entrega[] },
  );

  /** Já entregue e ainda dentro do prazo = dá pra editar. */
  private editavel(item: ItemTimeline): boolean {
    return (
      (item.status === 'ENTREGUE' || item.status === 'ENTREGUE_COM_ATRASO') &&
      new Date(item.prazo) > new Date()
    );
  }

  /** Entra na seleção: o que falta entregar e o que dá pra editar. */
  readonly disponiveis = computed(() =>
    this.itensEntregaveis().filter(
      (item) => item.status === 'PENDENTE' || this.editavel(item),
    ),
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
          podeEditar: new Date(atividade.prazo) > new Date(),
          linhas: atividade.campos.map((c) => ({
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

  private readonly atividades = toSignal(this.atividadeService.listar(), {
    initialValue: [] as Atividade[],
  });

  /** Campos do formulário da atividade escolhida. */
  readonly camposDaAtividade = computed<CampoEntrega[]>(
    () =>
      this.atividades().find((a) => a.id === this.atividadeSelecionada())
        ?.campos ?? [],
  );

  readonly podeEnviar = computed(() => {
    const campos = this.camposDaAtividade();
    const respostas = this.respostas();
    return (
      !!this.atividadeSelecionada() &&
      campos.length > 0 &&
      campos.every((c) => !c.obrigatorio || !!respostas[c.id]?.trim()) &&
      !this.enviando()
    );
  });

  rotulo = rotuloCurso;

  constructor() {
    const inicial = this.route.snapshot.queryParamMap.get('atividade');

    if (inicial) {
      effect(() => {
        if (
          !this.atividadeSelecionada() &&
          this.disponiveis().some((item) => item.atividadeId === inicial)
        ) {
          this.atividadeSelecionada.set(inicial);
        }
      });
    }
  }

  rotuloTipo(tipo: TipoMaterial): string {
    return ROTULO_TIPO_MATERIAL[tipo];
  }

  publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { titulo, descricao, tipo, url, cursoId } = this.form.getRawValue();
    this.salvando.set(true);

    this.materialService
      .criar({
        titulo,
        descricao,
        tipo,
        url,
        cursoId: cursoId === '' ? null : cursoId,
      })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.form.reset({ tipo: 'MODELO', cursoId: '' });
        },
        error: () => this.salvando.set(false),
      });
  }

  async remover(materialId: string, titulo: string): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Remover material',
      mensagem: `Remover "${titulo}" da lista de materiais? Essa ação não pode ser desfeita.`,
      textoConfirmar: 'Remover',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }
    this.materialService.remover(materialId).subscribe();
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

  /** Por enquanto só o nome do arquivo segue na entrega (sem upload). */
  aoSelecionarArquivo(campoId: string, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.respostas.update((r) => ({
      ...r,
      [campoId]: input.files?.[0]?.name ?? '',
    }));
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
