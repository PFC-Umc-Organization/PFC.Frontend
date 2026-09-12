import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, switchMap } from 'rxjs';

import {
  ItemTimeline,
  Material,
  ROTULO_TIPO_MATERIAL,
  TipoMaterial,
  rotuloCurso,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CursoService } from '../../core/services/curso.service';
import { EntregaService } from '../../core/services/entrega.service';
import { MaterialService } from '../../core/services/material.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { TimelineComponent } from '../aluno/timeline.component';
import { IconeComponent } from '../../shared/components/icone.component';
import { PrazoPipe } from '../../shared/pipes/prazo.pipe';

/**
 * Para o professor, é a tela de "Materiais de Apoio" (publicar links de
 * modelos, guias e gravações). Para o aluno, é a tela de "Entregáveis":
 * escolher uma atividade do cronograma, anexar o arquivo e enviar a entrega
 * do grupo — como no `MateriaisComponent` original, essa tela não existe no
 * protótipo do Lovable e segue o mesmo sistema visual das outras.
 */
@Component({
  selector: 'app-materiais',
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent, PrazoPipe, TimelineComponent],
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
                  (click)="remover(m.id)"
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
            Escolha uma atividade cadastrada pelo professor, anexe o arquivo e
            envie a entrega do seu grupo antes do prazo.
          </p>
        </header>

        @if (ehPreviaDoProfessor()) {
          <p class="aviso">
            <app-icone nome="alerta" />
            <span>
              Prévia da visão do aluno
              @if (nomeProjetoPrevia()) {
                — projeto <strong>{{ nomeProjetoPrevia() }}</strong>
              }
              . Como professor, você não pode enviar entregas por aqui.
            </span>
          </p>
        }

        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Enviar entrega</h2>

            @if (ehPreviaDoProfessor()) {
              <p class="vazio mt-6">
                Entre como aluno para enviar uma entrega.
              </p>
            } @else if (disponiveis().length === 0) {
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
                      </option>
                    }
                  </select>
                </div>

                <div class="field">
                  <label class="field__label" for="arquivo">Arquivo</label>
                  <div class="upload">
                    <label for="arquivo" class="btn btn--outline">
                      Escolher arquivo
                    </label>
                    <span class="upload__nome">
                      {{ arquivo()?.name || 'Nenhum arquivo selecionado' }}
                    </span>
                  </div>
                  <input
                    id="arquivo"
                    #campoArquivo
                    type="file"
                    class="upload__input"
                    (change)="aoSelecionarArquivo($event)"
                  />
                </div>

                <div class="field form-grid__full">
                  <label class="field__label" for="observacao">
                    Observação (opcional)
                  </label>
                  <textarea
                    id="observacao"
                    class="control control--textarea"
                    placeholder="Algum comentário para o professor."
                    [value]="observacao()"
                    (input)="aoDigitarObservacao($event)"
                  ></textarea>
                </div>

                <div class="form-grid__full">
                  <button
                    type="button"
                    class="btn btn--primary"
                    [disabled]="!podeEnviar()"
                    (click)="enviarEntrega(campoArquivo)"
                  >
                    <app-icone nome="mais" class="btn__icon" />
                    Enviar entrega
                  </button>
                  @if (mensagem()) {
                    <p class="confirmacao">{{ mensagem() }}</p>
                  }
                </div>
              </div>
            }
          </div>
        </section>

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
  private readonly cursoService = inject(CursoService);
  private readonly projetoService = inject(ProjetoService);
  private readonly entregaService = inject(EntregaService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly tipos: TipoMaterial[] = ['MODELO', 'DOCUMENTO', 'VIDEO', 'LINK'];

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });
  readonly materiais = toSignal(this.materialService.listar(), {
    initialValue: [] as Material[],
  });

  readonly visaoProfessor = computed(() => this.auth.perfilVisao() === 'PROFESSOR');
  readonly salvando = signal(false);

  readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    descricao: [''],
    tipo: ['MODELO' as TipoMaterial, [Validators.required]],
    url: ['', [Validators.required]],
    cursoId: [''],
  });

  /** Professor olhando a interface do aluno via "Ver como". */
  readonly ehPreviaDoProfessor = computed(
    () => this.auth.ehProfessor() && this.auth.perfilVisao() === 'ALUNO',
  );

  /** Todos os projetos — usado só para achar um grupo de exemplo na prévia. */
  private readonly projetos = toSignal(this.projetoService.listar(), {
    initialValue: [],
  });

  /** Projeto do grupo do aluno logado. */
  private readonly projetoDoAluno = toSignal(
    toObservable(computed(() => this.auth.usuario()?.id ?? '')).pipe(
      switchMap((id) => (id ? this.projetoService.doAluno(id) : of(null))),
    ),
    { initialValue: null },
  );

  /**
   * Qual projeto a tela mostra. Para o aluno é o grupo dele; para o
   * professor em prévia (que não pertence a projeto nenhum), o primeiro
   * projeto cadastrado — só para ele poder conferir a tela.
   */
  private readonly projetoAlvoId = computed(() =>
    this.ehPreviaDoProfessor()
      ? (this.projetos()[0]?.id ?? '')
      : (this.projetoDoAluno()?.id ?? ''),
  );

  readonly nomeProjetoPrevia = computed(
    () => this.projetos().find((p) => p.id === this.projetoAlvoId())?.nome ?? '',
  );

  readonly itensEntregaveis = toSignal(
    toObservable(this.projetoAlvoId).pipe(
      switchMap((id) =>
        id ? this.entregaService.timelineDoProjeto(id) : of([]),
      ),
    ),
    { initialValue: [] as ItemTimeline[] },
  );

  /** Só entra na lista de seleção quem ainda pode ser entregue no prazo. */
  readonly disponiveis = computed(() =>
    this.itensEntregaveis().filter((item) => item.status === 'PENDENTE'),
  );

  readonly atividadeSelecionada = signal('');
  readonly arquivo = signal<File | null>(null);
  readonly observacao = signal('');
  readonly enviando = signal(false);
  readonly mensagem = signal('');

  readonly podeEnviar = computed(
    () => !!this.atividadeSelecionada() && !!this.arquivo() && !this.enviando(),
  );

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

  remover(materialId: string): void {
    this.materialService.remover(materialId).subscribe();
  }

  aoTrocarAtividade(evento: Event): void {
    this.atividadeSelecionada.set((evento.target as HTMLSelectElement).value);
    this.mensagem.set('');
  }

  aoDigitarObservacao(evento: Event): void {
    this.observacao.set((evento.target as HTMLTextAreaElement).value);
  }

  aoSelecionarArquivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.arquivo.set(input.files?.[0] ?? null);
  }

  enviarEntrega(campoArquivo: HTMLInputElement): void {
    const atividadeId = this.atividadeSelecionada();
    const arquivo = this.arquivo();
    const projetoId = this.projetoAlvoId();

    if (!atividadeId || !arquivo || !projetoId || this.ehPreviaDoProfessor()) {
      return;
    }

    this.enviando.set(true);

    this.entregaService
      .entregar(atividadeId, projetoId, arquivo, this.observacao().trim() || undefined)
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.mensagem.set('Entrega enviada com sucesso.');
          this.atividadeSelecionada.set('');
          this.arquivo.set(null);
          this.observacao.set('');
          campoArquivo.value = '';
        },
        error: () => this.enviando.set(false),
      });
  }
}
