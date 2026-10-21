import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, of, startWith, switchMap } from 'rxjs';

import { Curso, Graduacao, ROTULO_TURNO, Turno } from '../../core/models';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { CursoService } from '../../core/services/curso.service';
import { GraduacaoService } from '../../core/services/graduacao.service';
import { IconeComponent } from '../../shared/components/icone.component';

type SecaoTurmas = 'cursos' | 'turmas';

/**
 * Cursos e turmas, restrito a ADMIN. Uma turma é um curso + turno + período
 * e guarda o nome do curso, que precisa estar cadastrado. `listar()` do
 * HttpClient é um Observable frio — dispara uma vez e acaba — por isso os
 * `Subject` como gatilho manual de recarga.
 */
/** O formato que o backend aceita: ano e semestre, com ponto, barra ou hífen. */
const PERIODO = /^\s*\d{4}\s*[./-]\s*[12]\s*$/;

@Component({
  selector: 'app-turmas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Administração</p>
        <h1 class="page-title mt-2">Cursos e turmas</h1>
      </header>

      <!-- ------------------------- menu de seções ------------------------- -->
      <div class="segmented segmented--grid secoes" role="group" aria-label="Seção da tela">
        @for (s of secoes; track s.id) {
          <button
            type="button"
            class="segmented__item"
            [attr.aria-pressed]="secao() === s.id"
            (click)="secao.set(s.id)"
          >
            {{ s.rotulo }}
          </button>
        }
      </div>

      <!-- ------------------------------ cursos ------------------------------ -->
      @if (secao() === 'cursos') {
        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Novo curso</h2>

            @if (erroCurso()) {
              <p class="alerta" role="alert">
                <app-icone nome="alerta" />
                <span>{{ erroCurso() }}</span>
              </p>
            }

            <form
              class="form-grid form-grid--2 mt-6"
              [formGroup]="novoCursoForm"
              (ngSubmit)="criarCurso()"
            >
              <div class="field">
                <label class="field__label" for="novo-curso-nome">Nome do curso</label>
                <input
                  id="novo-curso-nome"
                  type="text"
                  class="control"
                  placeholder="Ex.: Engenharia de Software"
                  maxlength="100"
                  formControlName="nome"
                  [class.control--invalid]="invalidoNovoCurso()"
                />
                @if (invalidoNovoCurso()) {
                  <span class="field__error">Informe o nome do curso.</span>
                }
              </div>

              <div class="form-grid__full">
                <button type="submit" class="btn btn--primary" [disabled]="criandoCurso()">
                  <app-icone nome="mais" class="btn__icon" />
                  {{ criandoCurso() ? 'Criando…' : 'Criar curso' }}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section class="card card--flush">
          <div class="card__head">
            <app-icone nome="livro" class="card__head-icone" />
            <h2 class="section-title">Cursos cadastrados ({{ cursos().length }})</h2>
          </div>

          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Curso</th>
                  <th scope="col">Turmas</th>
                  <th scope="col"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (c of cursos(); track c.id) {
                  @if (editandoCursoId() === c.id) {
                    <tr>
                      <td colspan="3">
                        <form
                          class="form-grid form-grid--2 pfc-edicao"
                          [formGroup]="editCursoForm"
                          (ngSubmit)="salvarEdicaoCurso(c.id)"
                        >
                          <div class="field">
                            <label class="field__label" for="edit-curso-nome">
                              Nome do curso
                            </label>
                            <input
                              id="edit-curso-nome"
                              type="text"
                              class="control"
                              maxlength="100"
                              formControlName="nome"
                              [class.control--invalid]="invalidoEdicaoCurso()"
                            />
                            @if (c.nome !== editCursoForm.controls.nome.value.trim() && turmasDoCurso(c) > 0) {
                              <span class="field__hint">
                                As {{ turmasDoCurso(c) }} turma(s) deste curso passam a usar o novo nome.
                              </span>
                            }
                          </div>
                          <div class="form-grid__full row">
                            <button type="submit" class="btn btn--primary btn--sm">Salvar</button>
                            <button
                              type="button"
                              class="btn btn--outline btn--sm"
                              (click)="editandoCursoId.set(null)"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  } @else {
                    <tr>
                      <td class="cell-strong">{{ c.nome }}</td>
                      <td>{{ turmasDoCurso(c) }}</td>
                      <td>
                        <div class="row">
                          <button
                            type="button"
                            class="acao-remover"
                            (click)="iniciarEdicaoCurso(c)"
                            [attr.aria-label]="'Editar curso ' + c.nome"
                          >
                            <app-icone nome="editar" />
                          </button>
                          <button
                            type="button"
                            class="acao-remover"
                            [disabled]="turmasDoCurso(c) > 0"
                            [attr.title]="
                              turmasDoCurso(c) > 0
                                ? 'Remova as turmas do curso antes de excluí-lo'
                                : null
                            "
                            (click)="excluirCurso(c)"
                            [attr.aria-label]="'Excluir curso ' + c.nome"
                          >
                            <app-icone nome="lixeira" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr>
                    <td class="table-empty" colspan="3">Nenhum curso cadastrado ainda.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- ------------------------------ turmas ------------------------------ -->
      @if (secao() === 'turmas') {
        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Nova turma</h2>

            @if (erro()) {
              <p class="alerta" role="alert">
                <app-icone nome="alerta" />
                <span>{{ erro() }}</span>
              </p>
            }

            @if (cursos().length === 0) {
              <p class="alerta" role="alert">
                <app-icone nome="alerta" />
                <span>
                  Nenhum curso cadastrado. Cadastre o curso antes de criar a turma.
                  <button type="button" class="link-button" (click)="secao.set('cursos')">
                    Ir para Cursos
                  </button>
                </span>
              </p>
            } @else {
              <form
                class="form-grid form-grid--2 mt-6"
                [formGroup]="novoForm"
                (ngSubmit)="criar()"
              >
                <div class="field">
                  <label class="field__label" for="novo-nome">Curso</label>
                  <select
                    id="novo-nome"
                    class="control"
                    formControlName="nome"
                    [class.control--invalid]="invalidoNovo('nome')"
                  >
                    <option value="" disabled>Selecione o curso</option>
                    @for (c of cursos(); track c.id) {
                      <option [value]="c.nome">{{ c.nome }}</option>
                    }
                  </select>
                  @if (invalidoNovo('nome')) {
                    <span class="field__error">Selecione o curso.</span>
                  }
                </div>

                <div class="field">
                  <label class="field__label" for="novo-turno">Turno</label>
                  <select id="novo-turno" class="control" formControlName="turno">
                    <option value="MANHA">Manhã</option>
                    <option value="NOITE">Noite</option>
                  </select>
                </div>

                <div class="field">
                  <label class="field__label" for="novo-periodo">Período</label>
                  <input
                    id="novo-periodo"
                    type="text"
                    class="control"
                    placeholder="Ex.: 2026.2"
                    inputmode="decimal"
                    formControlName="periodo"
                    [class.control--invalid]="invalidoNovo('periodo')"
                  />
                  <span class="field__hint">Ano e semestre: 2026.1 ou 2026.2.</span>
                  @if (invalidoNovo('periodo')) {
                    <span class="field__error">Use ano e semestre, como 2026.2.</span>
                  }
                </div>

                <div class="form-grid__full">
                  <button type="submit" class="btn btn--primary" [disabled]="criando()">
                    <app-icone nome="mais" class="btn__icon" />
                    {{ criando() ? 'Criando…' : 'Criar turma' }}
                  </button>
                </div>
              </form>
            }
          </div>
        </section>

        <section class="card card--flush">
          <div class="card__head pfcs__head">
            <div class="row">
              <app-icone nome="calendario" class="card__head-icone" />
              <h2 class="section-title">Turmas cadastradas ({{ turmasVisiveis().length }})</h2>
            </div>

            <div class="field filtro-curso">
              <label class="sr-only" for="filtro-curso">Curso</label>
              <select
                id="filtro-curso"
                class="control"
                [value]="filtroCurso()"
                (change)="filtroCurso.set($any($event.target).value)"
              >
                <option value="">Todos os cursos</option>
                @for (c of cursos(); track c.id) {
                  <option [value]="c.nome">{{ c.nome }}</option>
                }
              </select>
            </div>
          </div>

          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Curso</th>
                  <th scope="col">Turno</th>
                  <th scope="col">Período</th>
                  <th scope="col"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (c of turmasVisiveis(); track c.id) {
                  @if (editandoId() === c.id) {
                    <tr>
                      <td colspan="4">
                        <form
                          class="form-grid form-grid--2 pfc-edicao"
                          [formGroup]="editForm"
                          (ngSubmit)="salvarEdicao(c.id)"
                        >
                          <div class="field">
                            <label class="field__label" for="edit-nome">Curso</label>
                            <select
                              id="edit-nome"
                              class="control"
                              formControlName="nome"
                              [class.control--invalid]="invalidoEdicao('nome')"
                            >
                              @for (opcao of cursos(); track opcao.id) {
                                <option [value]="opcao.nome">{{ opcao.nome }}</option>
                              }
                            </select>
                          </div>
                          <div class="field">
                            <label class="field__label" for="edit-turno">Turno</label>
                            <select id="edit-turno" class="control" formControlName="turno">
                              <option value="MANHA">Manhã</option>
                              <option value="NOITE">Noite</option>
                            </select>
                          </div>
                          <div class="field">
                            <label class="field__label" for="edit-periodo">Período</label>
                            <input
                              id="edit-periodo"
                              type="text"
                              class="control"
                              placeholder="Ex.: 2026.2"
                              formControlName="periodo"
                              [class.control--invalid]="invalidoEdicao('periodo')"
                            />
                            @if (invalidoEdicao('periodo')) {
                              <span class="field__error">Use ano e semestre, como 2026.2.</span>
                            }
                          </div>
                          <div class="form-grid__full row">
                            <button type="submit" class="btn btn--primary btn--sm">Salvar</button>
                            <button
                              type="button"
                              class="btn btn--outline btn--sm"
                              (click)="cancelarEdicao()"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  } @else {
                    <tr>
                      <td class="cell-strong">
                        {{ c.nome }}
                        @if (!cursoCadastrado(c.nome)) {
                          <span
                            class="badge badge--muted"
                            title="Cadastre este curso na aba Cursos para poder editar a turma"
                          >
                            Curso não cadastrado
                          </span>
                        }
                      </td>
                      <td>{{ rotuloTurno(c.turno) }}</td>
                      <td>{{ c.periodo }}</td>
                      <td>
                        <div class="row">
                          <button
                            type="button"
                            class="acao-remover"
                            (click)="iniciarEdicao(c)"
                            [attr.aria-label]="'Editar turma ' + c.nome"
                          >
                            <app-icone nome="editar" />
                          </button>
                          <button
                            type="button"
                            class="acao-remover"
                            (click)="excluir(c.id, c.nome)"
                            [attr.aria-label]="'Excluir turma ' + c.nome"
                          >
                            <app-icone nome="lixeira" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr>
                    <td class="table-empty" colspan="4">
                      {{
                        filtroCurso()
                          ? 'Este curso ainda não tem turmas.'
                          : 'Nenhuma turma cadastrada ainda.'
                      }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .alerta {
      margin-top: 1rem;
    }

    .pfc-edicao {
      padding: 0.5rem 0;
    }

    .secoes {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pfcs__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .filtro-curso {
      min-width: 14rem;
    }

    .badge {
      margin-left: 0.5rem;
    }
  `,
})
export class TurmasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cursoService = inject(CursoService);
  private readonly graduacaoService = inject(GraduacaoService);
  private readonly confirmacao = inject(ConfirmacaoService);

  /** A tela mostra uma seção por vez; a escolha vem do menu no topo. */
  readonly secoes: { id: SecaoTurmas; rotulo: string }[] = [
    { id: 'cursos', rotulo: 'Cursos' },
    { id: 'turmas', rotulo: 'Turmas' },
  ];
  readonly secao = signal<SecaoTurmas>('cursos');

  /* ------------------------------- cursos ------------------------------- */

  private readonly recarregarCursos$ = new Subject<void>();

  readonly cursos = toSignal(
    this.recarregarCursos$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.graduacaoService.listar().pipe(
          catchError((e: Error) => {
            this.erroCurso.set(e.message);
            return of([] as Graduacao[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as Graduacao[] },
  );

  readonly erroCurso = signal('');
  readonly criandoCurso = signal(false);
  readonly editandoCursoId = signal<string | null>(null);

  readonly novoCursoForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
  });

  readonly editCursoForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
  });

  invalidoNovoCurso(): boolean {
    const c = this.novoCursoForm.controls.nome;
    return c.invalid && c.touched;
  }

  invalidoEdicaoCurso(): boolean {
    const c = this.editCursoForm.controls.nome;
    return c.invalid && c.touched;
  }

  turmasDoCurso(curso: Graduacao): number {
    return this.turmas().filter((t) => t.nome === curso.nome).length;
  }

  cursoCadastrado(nome: string): boolean {
    return this.cursos().some((c) => c.nome === nome);
  }

  criarCurso(): void {
    this.erroCurso.set('');

    if (this.novoCursoForm.invalid || !this.novoCursoForm.controls.nome.value.trim()) {
      this.novoCursoForm.markAllAsTouched();
      return;
    }

    this.criandoCurso.set(true);
    this.graduacaoService.criar(this.novoCursoForm.controls.nome.value).subscribe({
      next: () => {
        this.criandoCurso.set(false);
        this.novoCursoForm.reset({ nome: '' });
        this.recarregarCursos$.next();
      },
      error: (e: Error) => {
        this.criandoCurso.set(false);
        this.erroCurso.set(e.message);
      },
    });
  }

  iniciarEdicaoCurso(curso: Graduacao): void {
    this.erroCurso.set('');
    this.editandoCursoId.set(curso.id);
    this.editCursoForm.setValue({ nome: curso.nome });
  }

  salvarEdicaoCurso(cursoId: string): void {
    if (this.editCursoForm.invalid || !this.editCursoForm.controls.nome.value.trim()) {
      this.editCursoForm.markAllAsTouched();
      return;
    }

    this.erroCurso.set('');
    this.graduacaoService
      .atualizar(cursoId, this.editCursoForm.controls.nome.value)
      .subscribe({
        next: () => {
          this.editandoCursoId.set(null);
          // as turmas do curso passam a ter o nome novo
          this.recarregarCursos$.next();
          this.recarregar$.next();
        },
        error: (e: Error) => this.erroCurso.set(e.message),
      });
  }

  async excluirCurso(curso: Graduacao): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Excluir curso',
      mensagem: `Excluir o curso "${curso.nome}"? Essa ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }

    this.erroCurso.set('');
    this.graduacaoService.remover(curso.id).subscribe({
      next: () => this.recarregarCursos$.next(),
      error: (e: Error) => this.erroCurso.set(e.message),
    });
  }

  /* ------------------------------- turmas ------------------------------- */

  private readonly recarregar$ = new Subject<void>();

  readonly turmas = toSignal(
    this.recarregar$.pipe(
      startWith(undefined),
      switchMap(() => this.cursoService.listar()),
    ),
    { initialValue: [] as Curso[] },
  );

  /** "" = todos os cursos. */
  readonly filtroCurso = signal('');

  readonly turmasVisiveis = computed(() =>
    this.filtroCurso()
      ? this.turmas().filter((t) => t.nome === this.filtroCurso())
      : this.turmas(),
  );

  readonly erro = signal('');
  readonly criando = signal(false);
  readonly editandoId = signal<string | null>(null);

  readonly novoForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
    turno: ['MANHA' as Turno, [Validators.required]],
    periodo: ['', [Validators.required, Validators.pattern(PERIODO)]],
  });

  readonly editForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
    turno: ['MANHA' as Turno, [Validators.required]],
    periodo: ['', [Validators.required, Validators.pattern(PERIODO)]],
  });

  rotuloTurno(turno: Turno): string {
    return ROTULO_TURNO[turno];
  }

  invalidoNovo(campo: 'nome' | 'periodo'): boolean {
    const c = this.novoForm.controls[campo];
    return c.invalid && c.touched;
  }

  invalidoEdicao(campo: 'nome' | 'periodo'): boolean {
    const c = this.editForm.controls[campo];
    return c.invalid && c.touched;
  }

  criar(): void {
    this.erro.set('');

    if (this.novoForm.invalid) {
      this.novoForm.markAllAsTouched();
      return;
    }

    this.criando.set(true);
    this.cursoService.criar(this.novoForm.getRawValue()).subscribe({
      next: () => {
        this.criando.set(false);
        this.novoForm.reset({ nome: '', turno: 'MANHA', periodo: '' });
        this.recarregar$.next();
      },
      error: (e: Error) => {
        this.criando.set(false);
        this.erro.set(e.message);
      },
    });
  }

  iniciarEdicao(curso: Curso): void {
    this.erro.set('');
    this.editandoId.set(curso.id);
    this.editForm.setValue({
      nome: this.cursoCadastrado(curso.nome) ? curso.nome : '',
      turno: curso.turno,
      periodo: curso.periodo,
    });
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
  }

  salvarEdicao(cursoId: string): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.cursoService.atualizar(cursoId, this.editForm.getRawValue()).subscribe({
      next: () => {
        this.editandoId.set(null);
        this.recarregar$.next();
      },
      error: (e: Error) => this.erro.set(e.message),
    });
  }

  async excluir(cursoId: string, nome: string): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Excluir turma',
      mensagem: `Excluir a turma de "${nome}"? Essa ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }

    this.erro.set('');
    this.cursoService.remover(cursoId).subscribe({
      next: () => this.recarregar$.next(),
      error: (e: Error) => this.erro.set(e.message),
    });
  }
}
