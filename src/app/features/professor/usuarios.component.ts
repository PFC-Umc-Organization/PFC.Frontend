import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Subject,
  catchError,
  combineLatest,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import {
  Matricula,
  Perfil,
  ROTULO_PERFIL,
  ResultadoMatricula,
  StatusUsuario,
  Usuario,
  rotuloCurso,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { CursoService } from '../../core/services/curso.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { IconeComponent } from '../../shared/components/icone.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconeComponent],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Administração</p>
        <h1 class="page-title mt-2">Gerenciamento de Usuários</h1>
        <p class="lead mt-2">
          Acompanhe perfis, funções e acessos da comunidade Athena.
        </p>
      </header>

      <!-- ------------------- cadastrar orientador/admin ------------------- -->
      @if (souAdmin()) {
        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Cadastrar orientador ou admin</h2>
            <p class="lead text-sm mt-1">
              A pessoa recebe um convite por e-mail do próprio Cognito para
              definir a senha e entrar.
            </p>

            @if (sucessoContaCriada()) {
              <p class="ok" role="status">
                <app-icone nome="check" />
                <span>{{ sucessoContaCriada() }}</span>
              </p>
            }

            @if (erroContaCriada()) {
              <p class="alerta" role="alert">
                <app-icone nome="alerta" />
                <span>{{ erroContaCriada() }}</span>
              </p>
            }

            <form
              class="form-grid form-grid--2 mt-6"
              [formGroup]="novaContaForm"
              (ngSubmit)="cadastrarConta()"
            >
              <div class="field">
                <label class="field__label" for="nova-conta-nome">
                  Nome completo
                </label>
                <input
                  id="nova-conta-nome"
                  type="text"
                  class="control"
                  formControlName="nome"
                  [class.control--invalid]="invalidoNovaConta('nome')"
                />
                @if (invalidoNovaConta('nome')) {
                  <span class="field__error">Informe o nome completo.</span>
                }
              </div>

              <div class="field">
                <label class="field__label" for="nova-conta-email">E-mail</label>
                <input
                  id="nova-conta-email"
                  type="email"
                  class="control"
                  placeholder="nome@umc.br"
                  formControlName="email"
                  [class.control--invalid]="invalidoNovaConta('email')"
                />
                @if (invalidoNovaConta('email')) {
                  <span class="field__error">
                    Informe um e-mail institucional (@umc.br).
                  </span>
                }
              </div>

              <div class="field">
                <label class="field__label" for="nova-conta-perfil">Perfil</label>
                <select
                  id="nova-conta-perfil"
                  class="control"
                  formControlName="perfil"
                >
                  <option value="ORIENTADOR">Orientador</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div class="form-grid__full">
                <button
                  type="submit"
                  class="btn btn--primary"
                  [disabled]="cadastrandoConta()"
                >
                  <app-icone nome="mais" class="btn__icon" />
                  {{ cadastrandoConta() ? 'Cadastrando…' : 'Cadastrar' }}
                </button>
              </div>
            </form>
          </div>
        </section>
      }

      <!-- ------------------- pré-autorizar por RGM ------------------- -->
      <section class="card">
        <div class="card__body">
          <h2 class="section-title">Pré-autorizar alunos por RGM</h2>
          <p class="lead text-sm mt-1">
            O aluno cria a própria conta em "Criar conta" — o RGM aqui só
            libera o cadastro dele. Nome e e-mail são preenchidos pelo
            próprio aluno na hora.
          </p>

          @if (resultadoProvisionamento(); as resultado) {
            <p class="ok" role="status">
              <app-icone nome="check" />
              {{ resultado.processados }} RGM(s) pré-autorizado(s)
              @if (resultado.falhas.length > 0) {
                — {{ resultado.falhas.length }} falharam
              }
              .
            </p>
          }

          @if (erroProvisionamento()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erroProvisionamento() }}</span>
            </p>
          }

          @if (cursos().length === 0) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>
                Nenhuma turma cadastrada ainda — cadastre uma turma antes de
                pré-autorizar RGMs.
                <a routerLink="/turmas">Ir para Turmas</a>
              </span>
            </p>
          } @else {
          <form
            class="form-grid mt-6"
            [formGroup]="provisionamentoForm"
            (ngSubmit)="provisionar()"
          >
            <div class="field">
              <label class="field__label" for="provisionamento-turma">
                Turma
              </label>
              <select
                id="provisionamento-turma"
                class="control"
                formControlName="turmaId"
                [class.control--invalid]="invalidoProvisionamento('turmaId')"
              >
                <option value="" disabled>Selecione a turma</option>
                @for (c of cursos(); track c.id) {
                  <option [value]="c.id">{{ rotuloCurso(c) }}</option>
                }
              </select>
              @if (invalidoProvisionamento('turmaId')) {
                <span class="field__error">Selecione a turma.</span>
              }
            </div>

            <div class="field">
              <label class="field__label" for="rgms">RGMs</label>
              <textarea
                id="rgms"
                class="control control--textarea"
                placeholder="Um RGM por linha — ex.: 20260009"
                formControlName="rgms"
                [class.control--invalid]="invalidoProvisionamento('rgms')"
              ></textarea>
              <span class="field__hint">
                Aceita vários RGMs de uma vez — separados por linha ou
                vírgula. Todos entram pré-autorizados na turma selecionada.
              </span>
              @if (invalidoProvisionamento('rgms')) {
                <span class="field__error">
                  Informe ao menos um RGM válido (só números).
                </span>
              }
            </div>

            <div>
              <button
                type="submit"
                class="btn btn--primary"
                [disabled]="provisionando()"
              >
                <app-icone nome="mais" class="btn__icon" />
                {{ provisionando() ? 'Enviando…' : 'Pré-autorizar' }}
              </button>
            </div>
          </form>
          }
        </div>
      </section>

      <!-- ------------------- RGMs pré-autorizados ------------------- -->
      <section class="card card--flush">
        <div class="card__head">
          <app-icone nome="prancheta" class="card__head-icone" />
          <h2 class="section-title">RGMs pré-autorizados</h2>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">RGM</th>
                <th scope="col">Turma</th>
                <th scope="col">Situação</th>
                <th scope="col"><span class="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (m of matriculas(); track m.rgm) {
                <tr>
                  <td class="cell-strong">{{ m.rgm }}</td>
                  <td>{{ rotuloTurmaDoId(m.turmaId) }}</td>
                  <td>
                    @if (contaDoRgm(m.rgm); as conta) {
                      @if (conta.confirmado === false) {
                        <span
                          class="badge badge--muted"
                          title="A conta existe, mas o e-mail ainda não foi confirmado"
                        >
                          Conta não confirmada
                        </span>
                      } @else {
                        <span class="badge badge--primary">
                          Conta criada{{ conta.nome ? ' — ' + conta.nome : '' }}
                        </span>
                      }
                    } @else {
                      <span class="badge badge--muted">
                        Aguardando cadastro
                      </span>
                    }
                  </td>
                  <td>
                    <button
                      type="button"
                      class="acao-remover"
                      (click)="removerMatricula(m.rgm)"
                      [attr.aria-label]="
                        'Remover pré-autorização do RGM ' + m.rgm
                      "
                    >
                      <app-icone nome="lixeira" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td class="table-empty" colspan="4">
                    Nenhum RGM pré-autorizado no momento.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- ---------------------------- métricas ---------------------------- -->
      <div class="stat-grid">
        <article class="stat">
          <p class="stat__value">{{ totalAtivos() }}</p>
          <p class="stat__label">Usuários ativos</p>
        </article>
        <article class="stat">
          <p class="stat__value">{{ totalAlunos() }}</p>
          <p class="stat__label">Alunos</p>
        </article>
        <article class="stat">
          <p class="stat__value">{{ totalProfessores() }}</p>
          <p class="stat__label">Professores</p>
        </article>
      </div>

      <!-- ----------------------------- filtros ----------------------------- -->
      <div class="filtros">
        <div class="field">
          <label class="field__label" for="busca">Buscar usuário</label>
          <div class="control-wrap">
            <app-icone nome="busca" class="control-wrap__icon" />
            <input
              id="busca"
              type="search"
              class="control"
              placeholder="Nome, e-mail ou RGM"
              [value]="busca()"
              (input)="aoBuscar($event)"
            />
          </div>
        </div>

        <div class="field">
          <label class="field__label" for="funcao">Filtrar por função</label>
          <select
            id="funcao"
            class="control"
            [value]="perfilFiltro()"
            (change)="aoFiltrarPerfil($event)"
          >
            <option value="TODOS">Todos</option>
            <option value="ORIENTADOR">Orientador</option>
            <option value="ADMIN">Admin</option>
            <option value="ALUNO">Aluno</option>
          </select>
        </div>
      </div>

      <!-- --------------------------- listagem --------------------------- -->
      <section class="card card--flush">
        <div class="card__head">
          <app-icone nome="usuarios" class="card__head-icone" />
          <h2 class="section-title">Pessoas cadastradas</h2>
        </div>

        @if (erroUsuarios()) {
          <p class="alerta alerta--lista" role="alert">
            <app-icone nome="alerta" />
            <span>{{ erroUsuarios() }}</span>
          </p>
        }

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">Usuário</th>
                <th scope="col">RGM</th>
                <th scope="col">E-mail</th>
                <th scope="col">Função</th>
                <th scope="col">Status</th>
                @if (edicaoDisponivel) {
                  <th scope="col"><span class="sr-only">Ações</span></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (u of usuarios(); track u.id) {
                @if (editando()?.id === u.id) {
                  <tr>
                    <td colspan="6">
                      @if (erroEdicao()) {
                        <p class="alerta" role="alert">
                          <app-icone nome="alerta" />
                          <span>{{ erroEdicao() }}</span>
                        </p>
                      }

                      <form
                        class="form-grid form-grid--2 usuario-edicao"
                        [formGroup]="editForm"
                        (ngSubmit)="salvarEdicao(u.id)"
                      >
                        <div class="field">
                          <label class="field__label" for="edit-nome">
                            Nome completo
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
                              Informe o nome completo.
                            </span>
                          }
                        </div>

                        <div class="field">
                          <label class="field__label" for="edit-status">
                            Status
                          </label>
                          <select
                            id="edit-status"
                            class="control"
                            formControlName="status"
                          >
                            <option value="ATIVO">Ativo</option>
                            <option value="INATIVO">Inativo</option>
                          </select>
                        </div>

                        @if (u.perfil === 'ALUNO') {
                          <div class="field">
                            <label class="field__label" for="edit-turma">
                              Turma
                            </label>
                            <select
                              id="edit-turma"
                              class="control"
                              formControlName="cursoId"
                            >
                              @for (c of cursos(); track c.id) {
                                <option [value]="c.id">
                                  {{ rotuloCurso(c) }}
                                </option>
                              }
                            </select>
                          </div>
                        }

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
                    <td class="cell-strong">
                      @if (u.nome) {
                        {{ u.nome }}
                      } @else {
                        <!-- conta criada à mão no console, sem o atributo name -->
                        <span class="muted">Sem nome cadastrado</span>
                      }
                    </td>
                    <td>{{ u.rgm ?? '—' }}</td>
                    <td>{{ u.email }}</td>
                    <td>
                      <span
                        class="badge"
                        [class]="
                          u.perfil === 'ALUNO' ? 'badge--muted' : 'badge--primary'
                        "
                      >
                        {{ rotuloPerfil(u.perfil) }}
                      </span>
                    </td>
                    <td>
                      <span
                        class="badge"
                        [class]="
                          u.status === 'ATIVO'
                            ? 'badge--success'
                            : 'badge--destructive'
                        "
                      >
                        {{ u.status === 'ATIVO' ? 'Ativo' : 'Inativo' }}
                      </span>
                      @if (u.confirmado === false) {
                        <span class="badge badge--muted">E-mail não confirmado</span>
                      }
                    </td>
                    @if (edicaoDisponivel) {
                      <td>
                        <div class="row">
                          <button
                            type="button"
                            class="acao-remover"
                            (click)="iniciarEdicao(u)"
                            [attr.aria-label]="'Editar usuário ' + u.nome"
                          >
                            <app-icone nome="editar" />
                          </button>
                          <button
                            type="button"
                            class="acao-remover"
                            (click)="excluirUsuario(u.id, u.nome)"
                            [attr.aria-label]="'Excluir usuário ' + u.nome"
                          >
                            <app-icone nome="lixeira" />
                          </button>
                        </div>
                      </td>
                    }
                  </tr>
                }
              } @empty {
                <tr>
                  <td class="table-empty" [attr.colspan]="edicaoDisponivel ? 6 : 5">
                    Nenhum usuário encontrado com esses filtros.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: `
    .card__head-icone {
      --icone-size: 1.125rem;
      color: var(--primary);
    }

    .ok {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--success);
      background: color-mix(in oklch, var(--success) 8%, transparent);
      border: 1px solid color-mix(in oklch, var(--success) 30%, transparent);
    }

    .alerta {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--destructive);
      background: color-mix(in oklch, var(--destructive) 6%, transparent);
      border: 1px solid
        color-mix(in oklch, var(--destructive) 30%, transparent);
    }

    .alerta--lista {
      margin: 0 1.25rem 1rem;
    }

    td .badge + .badge {
      margin-left: 0.375rem;
    }

    .filtros {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
    }

    @media (min-width: 720px) {
      .filtros {
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        align-items: end;
      }
    }

    .usuario-edicao {
      padding: 0.5rem 0;
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
export class UsuariosComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly cursoService = inject(CursoService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly rotuloCurso = rotuloCurso;

  /** Só admin cadastra orientador/admin — orientador não vê esse card. */
  readonly souAdmin = computed(() => this.auth.perfil() === 'ADMIN');

  readonly busca = signal('');
  readonly perfilFiltro = signal<Perfil | 'TODOS'>('TODOS');

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });

  /* ------------------------ pré-autorização por RGM ------------------------ */

  /** Gatilho manual — `listar()` do HttpClient é frio, dispara uma vez só. */
  private readonly recarregarMatriculas$ = new Subject<void>();

  readonly matriculas = toSignal(
    this.recarregarMatriculas$.pipe(
      startWith(undefined),
      switchMap(() => this.matriculaService.listar()),
    ),
    { initialValue: [] as Matricula[] },
  );

  readonly provisionamentoForm = this.fb.nonNullable.group({
    turmaId: ['', [Validators.required]],
    rgms: ['', [Validators.required]],
  });

  readonly provisionando = signal(false);
  readonly resultadoProvisionamento = signal<ResultadoMatricula | null>(null);
  readonly erroProvisionamento = signal('');

  readonly editando = signal<Usuario | null>(null);
  readonly erroEdicao = signal('');

  readonly editForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    status: ['ATIVO', [Validators.required]],
    cursoId: [''],
  });

  private readonly filtro = computed(() => ({
    busca: this.busca(),
    perfil: this.perfilFiltro(),
  }));

  /** Editar/excluir só existem no mock — no backend real ficam ocultos. */
  readonly edicaoDisponivel = this.usuarioService.edicaoDisponivel;
  readonly erroUsuarios = signal('');

  /**
   * Gatilho manual de recarga — `listar()` do HttpClient é cacheado, então
   * trocar o filtro não refaz a chamada; precisa de algo pra forçar depois
   * de cadastrar uma conta nova (ver `cadastrarConta`).
   */
  private readonly recarregarUsuarios$ = new Subject<void>();

  readonly usuarios = toSignal(
    combineLatest([
      toObservable(this.filtro),
      this.recarregarUsuarios$.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([f]) =>
        this.usuarioService.listar(f).pipe(
          catchError((e: Error) => {
            this.erroUsuarios.set(e.message);
            return of([] as Usuario[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as Usuario[] },
  );

  /** Métricas sempre sobre a base inteira, independentes dos filtros. */
  private readonly todos = toSignal(
    this.recarregarUsuarios$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.usuarioService.listar().pipe(catchError(() => of([] as Usuario[]))),
      ),
    ),
    { initialValue: [] as Usuario[] },
  );

  /* ------------------------ cadastro de orientador/admin ------------------------ */

  readonly novaContaForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: [
      '',
      [Validators.required, Validators.email, Validators.pattern(/@umc\.br$/i)],
    ],
    perfil: ['ORIENTADOR' as 'ORIENTADOR' | 'ADMIN', [Validators.required]],
  });

  readonly cadastrandoConta = signal(false);
  readonly sucessoContaCriada = signal('');
  readonly erroContaCriada = signal('');

  readonly totalAtivos = computed(
    () => this.todos().filter((u) => u.status === 'ATIVO').length,
  );
  readonly totalAlunos = computed(
    () => this.todos().filter((u) => u.perfil === 'ALUNO').length,
  );
  readonly totalProfessores = computed(
    () => this.todos().filter((u) => u.perfil !== 'ALUNO').length,
  );

  rotuloPerfil(perfil: Perfil): string {
    return ROTULO_PERFIL[perfil];
  }

  aoBuscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  aoFiltrarPerfil(evento: Event): void {
    this.perfilFiltro.set(
      (evento.target as HTMLSelectElement).value as Perfil | 'TODOS',
    );
  }

  /** Conta (aluno) cujo e-mail é <rgm>@… — o backend já devolve o `rgm`. */
  contaDoRgm(rgm: string): Usuario | undefined {
    return this.todos().find((u) => u.rgm === rgm);
  }

  invalidoProvisionamento(campo: 'turmaId' | 'rgms'): boolean {
    const c = this.provisionamentoForm.controls[campo];
    return c.invalid && c.touched;
  }

  /** Rótulo da turma pra exibir na lista de RGMs pré-autorizados. */
  rotuloTurmaDoId(turmaId?: string): string {
    const curso = this.cursos().find((c) => c.id === turmaId);
    return curso ? this.rotuloCurso(curso) : '—';
  }

  invalidoNovaConta(campo: 'nome' | 'email'): boolean {
    const c = this.novaContaForm.controls[campo];
    return c.invalid && c.touched;
  }

  cadastrarConta(): void {
    this.sucessoContaCriada.set('');
    this.erroContaCriada.set('');

    if (this.novaContaForm.invalid) {
      this.novaContaForm.markAllAsTouched();
      return;
    }

    this.cadastrandoConta.set(true);
    this.usuarioService.criarConta(this.novaContaForm.getRawValue()).subscribe({
      next: (resposta) => {
        this.cadastrandoConta.set(false);
        this.sucessoContaCriada.set(resposta.mensagem);
        this.novaContaForm.reset({ nome: '', email: '', perfil: 'ORIENTADOR' });
        this.recarregarUsuarios$.next();
      },
      error: (e: Error) => {
        this.cadastrandoConta.set(false);
        this.erroContaCriada.set(e.message);
      },
    });
  }

  private parseRgms(bruto: string): string[] {
    return Array.from(
      new Set(
        bruto
          .split(/[\s,;]+/)
          .map((r) => r.trim())
          .filter((r) => /^\d{4,12}$/.test(r)),
      ),
    );
  }

  provisionar(): void {
    this.resultadoProvisionamento.set(null);
    this.erroProvisionamento.set('');

    if (this.provisionamentoForm.invalid) {
      this.provisionamentoForm.markAllAsTouched();
      return;
    }

    const { turmaId, rgms: rgmsBrutos } = this.provisionamentoForm.getRawValue();
    const rgms = this.parseRgms(rgmsBrutos);

    if (rgms.length === 0) {
      this.erroProvisionamento.set(
        'Informe ao menos um RGM válido (só números).',
      );
      return;
    }

    this.provisionando.set(true);

    this.matriculaService.provisionar(rgms, turmaId).subscribe({
      next: (resultado) => {
        this.provisionando.set(false);
        this.resultadoProvisionamento.set(resultado);
        this.provisionamentoForm.reset({ turmaId: '', rgms: '' });
        this.recarregarMatriculas$.next();
      },
      error: (e: Error) => {
        this.provisionando.set(false);
        this.erroProvisionamento.set(
          e.message || 'Não foi possível pré-autorizar os RGMs.',
        );
      },
    });
  }

  async removerMatricula(rgm: string): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Remover pré-autorização',
      mensagem: `Remover a pré-autorização do RGM ${rgm}? A pessoa deixa de poder se cadastrar com esse RGM.`,
      textoConfirmar: 'Remover',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }

    this.matriculaService
      .remover([rgm])
      .subscribe(() => this.recarregarMatriculas$.next());
  }

  invalidoEdicao(): boolean {
    const c = this.editForm.controls.nome;
    return c.invalid && c.touched;
  }

  iniciarEdicao(u: Usuario): void {
    this.erroEdicao.set('');
    this.editando.set(u);
    this.editForm.setValue({
      nome: u.nome,
      status: u.status,
      cursoId: u.cursoIds.at(0) ?? '',
    });
  }

  cancelarEdicao(): void {
    this.editando.set(null);
  }

  salvarEdicao(usuarioId: string): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const ehAluno = this.editando()?.perfil === 'ALUNO';
    const { nome, status, cursoId } = this.editForm.getRawValue();

    this.usuarioService
      .atualizar(usuarioId, {
        nome,
        status: status as StatusUsuario,
        ...(ehAluno ? { cursoId } : {}),
      })
      .subscribe({
        next: () => this.editando.set(null),
        error: (e: Error) => this.erroEdicao.set(e.message),
      });
  }

  async excluirUsuario(usuarioId: string, nome: string): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Excluir usuário',
      mensagem: `Excluir a conta de "${nome}"? Essa ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }
    this.usuarioService.remover(usuarioId).subscribe();
  }
}
