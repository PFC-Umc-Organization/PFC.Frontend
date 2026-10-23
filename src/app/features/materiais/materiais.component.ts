import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, map, of, startWith } from 'rxjs';

import {
  EXTENSOES_ARQUIVO,
  Material,
  ROTULO_TIPO_MATERIAL,
  TipoMaterial,
  ehEquipeAcademica,
  problemaDoArquivo,
  rotuloTurma,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { CursoService } from '../../core/services/curso.service';
import { ErroApi } from '../../core/services/http-erro';
import { MaterialService } from '../../core/services/material.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { PrazoPipe } from '../../shared/pipes/prazo.pipe';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; materiais: Material[] };

/** Materiais de apoio: a equipe publica (link ou arquivo), todos consultam. */
@Component({
  selector: 'app-materiais',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent, PrazoPipe],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Apoio ao PFC</p>
        <h1 class="page-title mt-2">Materiais de apoio</h1>
        <p class="lead mt-2">
          @if (equipe()) {
            Modelos, guias e gravações para os grupos. Escolha a turma ou deixe
            "Todas as turmas" para publicar para todos.
          } @else {
            Modelos, guias e gravações publicados pela coordenação e pelos
            orientadores para a sua turma.
          }
        </p>
      </header>

      @if (equipe()) {
        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Publicar material</h2>

            <form class="form-grid form-grid--2 mt-6" [formGroup]="form" (ngSubmit)="publicar()">
              <div class="field">
                <label class="field__label" for="titulo">Título</label>
                <input
                  id="titulo"
                  type="text"
                  class="control"
                  placeholder="Ex.: Modelo oficial de PFC"
                  formControlName="titulo"
                  [class.control--invalid]="invalido('titulo')"
                />
                @if (invalido('titulo')) {
                  <span class="field__error">Informe um título de 3 a 150 caracteres.</span>
                }
              </div>

              <div class="field">
                <label class="field__label" for="tipo">Tipo</label>
                <select id="tipo" class="control" formControlName="tipo">
                  @for (t of tipos; track t) {
                    <option [value]="t">{{ rotuloTipo[t] }}</option>
                  }
                </select>
              </div>

              <fieldset class="field origem">
                <legend class="field__label">Conteúdo</legend>
                <div class="segmented" role="group" aria-label="Link ou arquivo">
                  <button
                    type="button"
                    class="segmented__item"
                    [attr.aria-pressed]="origem() === 'link'"
                    (click)="trocarOrigem('link')"
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    class="segmented__item"
                    [attr.aria-pressed]="origem() === 'arquivo'"
                    (click)="trocarOrigem('arquivo')"
                  >
                    Arquivo
                  </button>
                </div>
              </fieldset>

              @if (origem() === 'link') {
                <div class="field">
                  <label class="field__label" for="url">Link</label>
                  <input
                    id="url"
                    type="url"
                    class="control"
                    placeholder="https://…"
                    formControlName="url"
                    [class.control--invalid]="invalido('url')"
                  />
                  @if (invalido('url')) {
                    <span class="field__error">Informe um endereço que comece com https://</span>
                  }
                </div>
              } @else {
                <div class="field">
                  <span class="field__label">Arquivo</span>
                  <div class="upload">
                    <label for="material-arquivo" class="btn btn--outline" [class.btn--disabled]="progresso() !== null">
                      {{ arquivo() ? 'Trocar arquivo' : 'Escolher arquivo' }}
                    </label>
                    <span class="upload__nome" aria-live="polite">
                      @if (progresso() !== null) {
                        Enviando… {{ progresso() }}%
                      } @else {
                        {{ arquivo()?.nome || 'Nenhum arquivo selecionado' }}
                      }
                    </span>
                  </div>
                  @if (progresso() !== null) {
                    <progress class="upload__barra" max="100" [value]="progresso()"></progress>
                  }
                  <span class="field__hint">PDF, Office/LibreOffice, imagem, ZIP ou texto, até 50 MB.</span>
                  @if (erroArquivo()) {
                    <span class="field__error" role="alert">{{ erroArquivo() }}</span>
                  }
                  <input
                    id="material-arquivo"
                    type="file"
                    class="upload__input"
                    [accept]="extensoes"
                    [disabled]="progresso() !== null"
                    (change)="aoSelecionarArquivo($event)"
                  />
                </div>
              }

              <div class="field">
                <label class="field__label" for="turma">Turma</label>
                <select id="turma" class="control" formControlName="cursoId">
                  <option value="">Todas as turmas</option>
                  @for (c of turmas(); track c.id) {
                    <option [value]="c.id">{{ rotuloDaTurma(c) }}</option>
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
                <button type="submit" class="btn btn--primary" [disabled]="!podePublicar()">
                  <app-icone nome="mais" class="btn__icon" />
                  {{ salvando() ? 'Publicando…' : 'Publicar material' }}
                </button>
                @if (erroPublicar()) {
                  <p class="alerta mt-4" role="alert">
                    <app-icone nome="alerta" />
                    <span>{{ erroPublicar() }}</span>
                  </p>
                }
                @if (publicado()) {
                  <p class="ok mt-4" role="status">
                    <app-icone nome="check" />
                    <span>Material publicado.</span>
                  </p>
                }
              </div>
            </form>
          </div>
        </section>
      }

      @if (erroAcao()) {
        <p class="alerta" role="alert">
          <app-icone nome="alerta" />
          <span>{{ erroAcao() }}</span>
        </p>
      }

      @switch (estado().tipo) {
        @case ('carregando') {
          <p class="muted text-sm">Carregando materiais…</p>
        }
        @case ('erro') {
          <p class="alerta" role="alert">
            <app-icone nome="alerta" />
            <span>Não foi possível carregar os materiais: {{ mensagemErro() }}</span>
          </p>
        }
        @default {
          <div class="grade">
            @for (m of materiais(); track m.id) {
              <article class="material">
                <div class="material__topo">
                  <span class="badge badge--primary">{{ rotuloTipo[m.tipo] }}</span>
                  @if (podeRemover(m)) {
                    <button
                      type="button"
                      class="material__remover"
                      (click)="remover(m)"
                      [attr.aria-label]="'Remover ' + m.titulo"
                    >
                      <app-icone nome="lixeira" />
                    </button>
                  }
                </div>

                <h3 class="material__titulo">{{ m.titulo }}</h3>
                @if (m.descricao) {
                  <p class="material__desc">{{ m.descricao }}</p>
                }
                <p class="material__turma">{{ destino(m) }}</p>

                <footer class="material__base">
                  <span class="text-xs muted">
                    {{ m.publicadoEm | prazo: true }}
                    @if (m.publicadoPor) {
                      · {{ m.publicadoPor }}
                    }
                  </span>
                  @if (m.arquivo) {
                    <button type="button" class="material__link link-botao" (click)="baixar(m)">
                      Baixar
                      <app-icone nome="download" />
                    </button>
                  } @else {
                    <a class="material__link" [href]="m.url" target="_blank" rel="noopener noreferrer">
                      Abrir
                      <app-icone nome="link-externo" />
                    </a>
                  }
                </footer>
              </article>
            } @empty {
              <p class="vazio">
                @if (equipe()) {
                  Nenhum material publicado ainda. Os grupos veem aqui o que for publicado.
                } @else {
                  A coordenação ainda não publicou materiais para a sua turma.
                }
              </p>
            }
          </div>
        }
      }
    </div>
  `,
  styles: `
    .grade {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    }

    .origem {
      margin: 0;
      padding: 0;
      border: 0;
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

    .upload__barra {
      width: 100%;
      height: 0.375rem;
      accent-color: var(--primary);
    }

    /* Some visualmente, mas o <label for> abre o seletor e o teclado alcança. */
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

    .btn--disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .material__turma {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--bronze);
    }

    .material__link {
      flex-shrink: 0;
      white-space: nowrap;
    }

    .material__link.link-botao {
      text-decoration: none;
    }

    .origem .segmented {
      width: fit-content;
    }

    .vazio {
      grid-column: 1 / -1;
      padding: 2.5rem 1.25rem;
      text-align: center;
      color: var(--muted-foreground);
      background: var(--card);
      border: 1px dashed color-mix(in oklch, var(--primary) 20%, transparent);
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
  `,
})
export class MateriaisComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly materialService = inject(MaterialService);
  private readonly cursoService = inject(CursoService);
  private readonly confirmacao = inject(ConfirmacaoService);

  readonly equipe = computed(() => ehEquipeAcademica(this.auth.perfil()));
  readonly tipos: TipoMaterial[] = ['MODELO', 'DOCUMENTO', 'VIDEO', 'LINK'];
  readonly rotuloTipo = ROTULO_TIPO_MATERIAL;
  readonly extensoes = EXTENSOES_ARQUIVO.join(',');
  readonly rotuloDaTurma = rotuloTurma;

  readonly turmas = toSignal(this.cursoService.listar().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  readonly estado = toSignal(
    this.materialService.listar().pipe(
      map((materiais): Estado => ({ tipo: 'pronto', materiais })),
      catchError((e: Error) => of<Estado>({ tipo: 'erro', mensagem: e.message })),
      startWith<Estado>({ tipo: 'carregando' }),
    ),
    { initialValue: { tipo: 'carregando' } as Estado },
  );

  readonly materiais = computed(() => {
    const e = this.estado();
    return e.tipo === 'pronto' ? e.materiais : [];
  });

  readonly mensagemErro = computed(() => {
    const e = this.estado();
    return e.tipo === 'erro' ? e.mensagem : '';
  });

  readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    tipo: ['MODELO' as TipoMaterial, Validators.required],
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/\S+$/)]],
    cursoId: [''],
    descricao: ['', Validators.maxLength(2000)],
  });

  readonly origem = signal<'link' | 'arquivo'>('link');
  /** Arquivo já no bucket, pronto para publicar. */
  readonly arquivo = signal<{ chave: string; nome: string } | null>(null);
  readonly progresso = signal<number | null>(null);
  readonly erroArquivo = signal('');
  readonly salvando = signal(false);
  readonly erroPublicar = signal('');
  readonly publicado = signal(false);
  readonly erroAcao = signal('');

  private readonly formValido = toSignal(
    this.form.statusChanges.pipe(map(() => this.formOk())),
    { initialValue: false },
  );

  readonly podePublicar = computed(
    () =>
      this.formValido() &&
      (this.origem() === 'link' || this.arquivo() !== null) &&
      this.progresso() === null &&
      !this.salvando(),
  );

  private formOk(): boolean {
    const c = this.form.controls;
    return c.titulo.valid && c.descricao.valid && (this.origem() === 'arquivo' || c.url.valid);
  }

  invalido(campo: 'titulo' | 'url'): boolean {
    const c = this.form.controls[campo];
    return c.invalid && c.touched;
  }

  trocarOrigem(origem: 'link' | 'arquivo'): void {
    this.origem.set(origem);
    if (origem === 'arquivo') {
      this.form.controls.url.disable();
    } else {
      this.form.controls.url.enable();
    }
  }

  aoSelecionarArquivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) {
      return;
    }
    const problema = problemaDoArquivo(arquivo);
    this.erroArquivo.set(problema);
    if (problema) {
      return;
    }
    this.publicado.set(false);
    this.progresso.set(0);
    this.materialService.enviarArquivo(arquivo).subscribe({
      next: (ev) => {
        if (ev.tipo === 'progresso') {
          this.progresso.set(ev.percentual);
        } else {
          this.arquivo.set({ chave: ev.chave, nome: arquivo.name });
          this.progresso.set(null);
        }
      },
      error: (e: ErroApi) => {
        this.progresso.set(null);
        this.erroArquivo.set(
          e.status === 503 ? 'O envio de arquivos ainda não está disponível — publique um link.' : e.message,
        );
      },
    });
  }

  publicar(): void {
    this.erroPublicar.set('');
    this.publicado.set(false);
    if (!this.formOk()) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.podePublicar()) {
      return;
    }
    const { titulo, tipo, url, cursoId, descricao } = this.form.getRawValue();
    this.salvando.set(true);
    this.materialService
      .criar({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipo,
        cursoId: cursoId || null,
        ...(this.origem() === 'link' ? { url: url.trim() } : { arquivo: this.arquivo()!.chave }),
      })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.publicado.set(true);
          this.arquivo.set(null);
          this.form.reset({ tipo, cursoId });
        },
        error: (e: Error) => {
          this.salvando.set(false);
          this.erroPublicar.set(e.message);
        },
      });
  }

  /** A coordenação remove qualquer material; o orientador, os que publicou. */
  podeRemover(m: Material): boolean {
    const u = this.auth.usuario();
    return u?.perfil === 'ADMIN' || (u?.perfil === 'ORIENTADOR' && m.autorId === u.id);
  }

  destino(m: Material): string {
    if (!m.cursoId) {
      return 'Todas as turmas';
    }
    if (!this.equipe()) {
      return 'Para a sua turma';
    }
    const turma = this.turmas().find((t) => t.id === m.cursoId);
    return turma ? rotuloTurma(turma) : 'Turma removida';
  }

  async remover(m: Material): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Remover material',
      mensagem: `Remover "${m.titulo}"? Os grupos deixam de ver o material${m.arquivo ? ' e o arquivo é apagado' : ''}.`,
      textoConfirmar: 'Remover',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }
    this.erroAcao.set('');
    this.materialService.remover(m.id).subscribe({
      error: (e: Error) => this.erroAcao.set(e.message),
    });
  }

  baixar(m: Material): void {
    this.erroAcao.set('');
    this.materialService.linkDoArquivo(m.id).subscribe({
      next: ({ url }) => window.location.assign(url),
      error: (e: Error) => this.erroAcao.set(e.message),
    });
  }
}
