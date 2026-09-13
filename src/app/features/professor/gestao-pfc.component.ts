import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, combineLatest, of, startWith, switchMap } from 'rxjs';

import {
  Programa,
  Projeto,
  Usuario,
  ehEquipeAcademica,
  rotuloCurso,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CursoService } from '../../core/services/curso.service';
import { ProgramaService } from '../../core/services/programa.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { IconeComponent } from '../../shared/components/icone.component';

@Component({
  selector: 'app-gestao-pfc',
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Planejamento acadêmico</p>
        <h1 class="page-title mt-2">Gestão de PFC</h1>
        <p class="lead mt-2">
          Crie e acompanhe os PFCs de cada turma, monte os grupos por RGM e
          defina o orientador responsável.
        </p>
      </header>

      <!-- --------------------------- PFCs por turma --------------------------- -->
      <section class="card card--flush">
        <div class="card__head pfcs__head">
          <div class="row">
            <app-icone nome="templo" class="card__head-icone" />
            <h2 class="section-title">PFCs cadastrados</h2>
          </div>

          <div class="field pfcs__filtro">
            <label class="sr-only" for="turma-pfc">Turma</label>
            <select
              id="turma-pfc"
              class="control"
              [value]="turmaSelecionada()"
              (change)="trocarTurma($event)"
            >
              @for (c of cursos(); track c.id) {
                <option [value]="c.id">{{ rotuloCurso(c) }}</option>
              }
            </select>
          </div>
        </div>

        @if (erroPfc()) {
          <p class="alerta" role="alert">
            <app-icone nome="alerta" />
            <span>{{ erroPfc() }}</span>
          </p>
        }

        @if (!programaAtual()) {
          <!-- ------------------- turma sem PFC iniciado ------------------- -->
          <div class="pfcs__vazio">
            <p class="lead text-sm">
              Nenhum PFC iniciado para esta turma ainda.
            </p>
            <button
              type="button"
              class="btn btn--primary btn--sm"
              [disabled]="iniciandoPrograma()"
              (click)="iniciarPrograma()"
            >
              <app-icone nome="mais" class="btn__icon" />
              {{
                iniciandoPrograma() ? 'Iniciando…' : 'Iniciar PFC nesta turma'
              }}
            </button>
          </div>
        } @else {
          <!-- ---------------------------- novo PFC ---------------------------- -->
          <form
            class="form-grid form-grid--2 novo-pfc"
            [formGroup]="novoForm"
            (ngSubmit)="criarPfc()"
          >
            <div class="field">
              <label class="field__label" for="novo-nome">
                Nome do novo PFC
              </label>
              <input
                id="novo-nome"
                type="text"
                class="control"
                placeholder="Ex.: Athena"
                formControlName="nome"
                [class.control--invalid]="invalidoNovo()"
              />
              @if (invalidoNovo()) {
                <span class="field__error">Informe o nome do PFC.</span>
              }
            </div>

            <div class="field">
              <label class="field__label" for="novo-descricao">
                Descrição
              </label>
              <input
                id="novo-descricao"
                type="text"
                class="control"
                formControlName="descricao"
              />
            </div>

            <div class="form-grid__full">
              <button
                type="submit"
                class="btn btn--primary btn--sm"
                [disabled]="criando()"
              >
                <app-icone nome="mais" class="btn__icon" />
                {{ criando() ? 'Criando…' : 'Criar PFC' }}
              </button>
            </div>
          </form>

          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">PFC</th>
                  <th scope="col">Integrantes</th>
                  <th scope="col">Orientador</th>
                  <th scope="col"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (p of pfcs(); track p.id) {
                  @if (editandoId() === p.id) {
                    <tr>
                      <td colspan="4">
                        <form
                          class="form-grid form-grid--2 pfc-edicao"
                          [formGroup]="editForm"
                          (ngSubmit)="salvarEdicao(p.id)"
                        >
                          <div class="field">
                            <label class="field__label" for="edit-nome">
                              Nome
                            </label>
                            <input
                              id="edit-nome"
                              type="text"
                              class="control"
                              formControlName="nome"
                              [class.control--invalid]="invalidoEdicao()"
                            />
                            @if (invalidoEdicao()) {
                              <span class="field__error">
                                Informe o nome do PFC.
                              </span>
                            }
                          </div>
                          <div class="field">
                            <label class="field__label" for="edit-descricao">
                              Descrição
                            </label>
                            <input
                              id="edit-descricao"
                              type="text"
                              class="control"
                              formControlName="descricao"
                            />
                          </div>

                          <div class="field form-grid__full">
                            <label class="field__label">
                              Integrantes (por RGM)
                            </label>

                            @if (erroIntegrante()) {
                              <span class="field__error">
                                {{ erroIntegrante() }}
                              </span>
                            }

                            <ul class="integrantes-lista">
                              @for (rgm of p.integrantes; track rgm) {
                                <li class="integrantes-lista__item">
                                  <span>{{ nomePorRgm(rgm) }}</span>
                                  <button
                                    type="button"
                                    class="acao-remover"
                                    (click)="removerIntegrante(p.id, rgm)"
                                    [attr.aria-label]="
                                      'Remover integrante ' + rgm
                                    "
                                  >
                                    <app-icone nome="lixeira" />
                                  </button>
                                </li>
                              } @empty {
                                <li class="muted text-sm">
                                  Nenhum integrante ainda.
                                </li>
                              }
                            </ul>

                            <div class="row mt-2">
                              <input
                                type="text"
                                inputmode="numeric"
                                class="control"
                                placeholder="RGM do aluno"
                                [value]="rgmParaAdicionar()"
                                (input)="aoDigitarRgm($event)"
                              />
                              <button
                                type="button"
                                class="btn btn--outline btn--sm"
                                (click)="adicionarIntegrante(p.id)"
                              >
                                <app-icone nome="mais" class="btn__icon" />
                                Adicionar
                              </button>
                            </div>
                          </div>

                          <div class="form-grid__full row">
                            <button
                              type="submit"
                              class="btn btn--primary btn--sm"
                            >
                              Salvar
                            </button>
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
                      <td class="cell-strong">{{ p.nome }}</td>
                      <td>{{ nomesIntegrantes(p) }}</td>
                      <td>
                        @if (souCoordenador()) {
                          @if (editandoOrientadorId() === p.id) {
                            <div class="row">
                              <select
                                class="control pfcs__orientador"
                                [value]="p.orientadorId ?? ''"
                                (change)="definirOrientador(p.id, $event)"
                              >
                                <option value="">Sem orientador</option>
                                @for (prof of professores(); track prof.id) {
                                  <option [value]="prof.id">
                                    {{ prof.nome }}
                                  </option>
                                }
                              </select>
                              <button
                                type="button"
                                class="btn btn--outline btn--sm"
                                (click)="editandoOrientadorId.set(null)"
                              >
                                Cancelar
                              </button>
                            </div>
                          } @else {
                            <div class="row">
                              <span>
                                {{
                                  p.orientadorId
                                    ? nomeUsuario(p.orientadorId)
                                    : 'Sem orientador'
                                }}
                              </span>
                              <button
                                type="button"
                                class="acao-remover"
                                (click)="editandoOrientadorId.set(p.id)"
                                [attr.aria-label]="
                                  (p.orientadorId ? 'Editar' : 'Adicionar') +
                                  ' orientador de ' +
                                  p.nome
                                "
                              >
                                <app-icone
                                  [nome]="p.orientadorId ? 'editar' : 'mais'"
                                />
                              </button>
                              @if (p.orientadorId) {
                                <button
                                  type="button"
                                  class="acao-remover"
                                  (click)="removerOrientador(p.id)"
                                  [attr.aria-label]="
                                    'Remover orientador de ' + p.nome
                                  "
                                >
                                  <app-icone nome="lixeira" />
                                </button>
                              }
                            </div>
                          }
                        } @else {
                          {{
                            p.orientadorId
                              ? nomeUsuario(p.orientadorId)
                              : 'Sem orientador'
                          }}
                        }
                      </td>
                      <td>
                        <div class="row">
                          <button
                            type="button"
                            class="acao-remover"
                            (click)="iniciarEdicao(p)"
                            [attr.aria-label]="'Editar PFC ' + p.nome"
                          >
                            <app-icone nome="editar" />
                          </button>
                          <button
                            type="button"
                            class="acao-remover"
                            (click)="excluirPfc(p.id)"
                            [attr.aria-label]="'Excluir PFC ' + p.nome"
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
                      Nenhum PFC cadastrado nesta turma ainda.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .card__head-icone {
      --icone-size: 1.125rem;
      color: var(--primary);
    }

    .pfcs__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .pfcs__filtro {
      min-width: 14rem;
    }

    .pfcs__orientador {
      height: 2.25rem;
      font-size: 0.8125rem;
    }

    .pfcs__vazio {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem;
    }

    .novo-pfc {
      padding: 1.25rem;
      border-bottom: 1px solid var(--border);
    }

    .pfc-edicao {
      padding: 0.5rem 0;
    }

    .integrantes-lista {
      display: grid;
      gap: 0.375rem;
      margin: 0.5rem 0 0;
      padding: 0;
      list-style: none;
    }

    .integrantes-lista__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.375rem 0.625rem;
      font-size: 0.8125rem;
      background: var(--marble);
      border: 1px solid color-mix(in oklch, var(--primary) 15%, transparent);
    }

    .alerta {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 1rem 1.25rem 0;
      padding: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--destructive);
      background: color-mix(in oklch, var(--destructive) 6%, transparent);
      border: 1px solid
        color-mix(in oklch, var(--destructive) 30%, transparent);
    }

    .acao-remover {
      display: inline-flex;
      padding: 0.375rem;
      color: var(--muted-foreground);
      border: 1px solid transparent;
    }

    .acao-remover:hover {
      color: var(--destructive);
      border-color: color-mix(in oklch, var(--destructive) 30%, transparent);
      background: color-mix(in oklch, var(--destructive) 6%, transparent);
    }
  `,
})
export class GestaoPfcComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly cursoService = inject(CursoService);
  private readonly programaService = inject(ProgramaService);
  private readonly projetoService = inject(ProjetoService);
  private readonly usuarioService = inject(UsuarioService);

  readonly rotuloCurso = rotuloCurso;

  readonly souCoordenador = computed(
    () => this.auth.perfil() === 'COORDENADOR',
  );

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });
  readonly turmaSelecionada = signal('c-eng-noite');

  /**
   * `listar()` do HttpClient é um Observable frio — dispara uma vez e
   * acaba. Sem esse `Subject` como gatilho manual, criar/editar não
   * atualizaria a tela até um F5 (a chamada HTTP original já tinha
   * completado, não há BehaviorSubject vivo como no mock).
   */
  private readonly recarregarProgramas$ = new Subject<void>();
  private readonly recarregarPfcs$ = new Subject<void>();

  readonly programas = toSignal(
    this.recarregarProgramas$.pipe(
      startWith(undefined),
      switchMap(() => this.programaService.listar()),
    ),
    { initialValue: [] as Programa[] },
  );

  /** Programa (turma) já iniciado para a turma escolhida, se houver. */
  readonly programaAtual = computed(
    () =>
      this.programas().find((p) => p.cursoId === this.turmaSelecionada()) ??
      null,
  );

  readonly pfcs = toSignal(
    combineLatest([
      toObservable(computed(() => this.programaAtual()?.id)),
      this.recarregarPfcs$.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([programaId]) =>
        programaId ? this.projetoService.listar(programaId) : of([]),
      ),
    ),
    { initialValue: [] as Projeto[] },
  );

  private readonly todosUsuarios = toSignal(this.usuarioService.listar(), {
    initialValue: [] as Usuario[],
  });

  readonly professores = computed(() =>
    this.todosUsuarios().filter((u) => ehEquipeAcademica(u.perfil)),
  );

  readonly erroPfc = signal('');

  readonly iniciandoPrograma = signal(false);

  readonly novoForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    descricao: [''],
  });
  readonly criando = signal(false);

  readonly editandoId = signal<string | null>(null);
  readonly editandoOrientadorId = signal<string | null>(null);

  readonly editForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    descricao: [''],
  });

  readonly rgmParaAdicionar = signal('');
  readonly erroIntegrante = signal('');

  trocarTurma(evento: Event): void {
    this.turmaSelecionada.set((evento.target as HTMLSelectElement).value);
  }

  nomeUsuario(id: string): string {
    return this.todosUsuarios().find((u) => u.id === id)?.nome ?? '—';
  }

  nomePorRgm(rgm: string): string {
    return this.todosUsuarios().find((u) => u.rgm === rgm)?.nome ?? rgm;
  }

  nomesIntegrantes(p: Projeto): string {
    return p.integrantes.map((rgm) => this.nomePorRgm(rgm)).join(', ') || '—';
  }

  iniciarPrograma(): void {
    this.erroPfc.set('');
    this.iniciandoPrograma.set(true);

    this.programaService
      .criar({ cursoId: this.turmaSelecionada() })
      .subscribe({
        next: () => {
          this.iniciandoPrograma.set(false);
          this.recarregarProgramas$.next();
        },
        error: (e: Error) => {
          this.iniciandoPrograma.set(false);
          this.erroPfc.set(e.message);
        },
      });
  }

  invalidoNovo(): boolean {
    const c = this.novoForm.controls.nome;
    return c.invalid && c.touched;
  }

  criarPfc(): void {
    this.erroPfc.set('');

    if (this.novoForm.invalid) {
      this.novoForm.markAllAsTouched();
      return;
    }

    const programa = this.programaAtual();

    if (!programa) {
      return;
    }

    this.criando.set(true);
    const { nome, descricao } = this.novoForm.getRawValue();

    this.projetoService
      .criar({ nome, descricao, programaId: programa.id, integrantes: [] })
      .subscribe({
        next: () => {
          this.criando.set(false);
          this.novoForm.reset();
          this.recarregarPfcs$.next();
        },
        error: (e: Error) => {
          this.criando.set(false);
          this.erroPfc.set(e.message);
        },
      });
  }

  iniciarEdicao(p: Projeto): void {
    this.erroPfc.set('');
    this.erroIntegrante.set('');
    this.rgmParaAdicionar.set('');
    this.editandoId.set(p.id);
    this.editForm.setValue({ nome: p.nome, descricao: p.descricao });
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
  }

  invalidoEdicao(): boolean {
    const c = this.editForm.controls.nome;
    return c.invalid && c.touched;
  }

  salvarEdicao(projetoId: string): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.projetoService
      .atualizar(projetoId, this.editForm.getRawValue())
      .subscribe({
        next: () => {
          this.editandoId.set(null);
          this.recarregarPfcs$.next();
        },
        error: (e: Error) => this.erroPfc.set(e.message),
      });
  }

  aoDigitarRgm(evento: Event): void {
    this.rgmParaAdicionar.set((evento.target as HTMLInputElement).value);
  }

  adicionarIntegrante(projetoId: string): void {
    const rgm = this.rgmParaAdicionar().trim();
    this.erroIntegrante.set('');

    if (!/^\d{4,12}$/.test(rgm)) {
      this.erroIntegrante.set('Informe um RGM válido (só números).');
      return;
    }

    this.projetoService.adicionarIntegrante(projetoId, rgm).subscribe({
      next: () => {
        this.rgmParaAdicionar.set('');
        this.recarregarPfcs$.next();
      },
      error: (e: Error) => this.erroIntegrante.set(e.message),
    });
  }

  removerIntegrante(projetoId: string, rgm: string): void {
    this.erroIntegrante.set('');
    this.projetoService.removerIntegrante(projetoId, rgm).subscribe({
      next: () => this.recarregarPfcs$.next(),
      error: (e: Error) => this.erroIntegrante.set(e.message),
    });
  }

  definirOrientador(projetoId: string, evento: Event): void {
    const orientadorId = (evento.target as HTMLSelectElement).value;
    this.erroPfc.set('');

    const acao = orientadorId
      ? this.projetoService.definirOrientador(projetoId, orientadorId)
      : this.projetoService.removerOrientador(projetoId);

    acao.subscribe({
      next: () => {
        this.editandoOrientadorId.set(null);
        this.recarregarPfcs$.next();
      },
      error: (e: Error) => this.erroPfc.set(e.message),
    });
  }

  removerOrientador(projetoId: string): void {
    this.erroPfc.set('');
    this.projetoService.removerOrientador(projetoId).subscribe({
      next: () => this.recarregarPfcs$.next(),
      error: (e: Error) => this.erroPfc.set(e.message),
    });
  }

  excluirPfc(projetoId: string): void {
    this.erroPfc.set('');
    this.projetoService.remover(projetoId).subscribe({
      next: () => this.recarregarPfcs$.next(),
      error: (e: Error) => this.erroPfc.set(e.message),
    });
  }
}
