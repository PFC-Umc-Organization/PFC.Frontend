import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';

import {
  Matricula,
  Perfil,
  ROTULO_PERFIL,
  ResultadoMatricula,
  StatusUsuario,
  Usuario,
  rotuloCurso,
} from '../../core/models';
import { CursoService } from '../../core/services/curso.service';
import { MatriculaService } from '../../core/services/matricula.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { IconeComponent } from '../../shared/components/icone.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Administração</p>
        <h1 class="page-title mt-2">Gerenciamento de Usuários</h1>
        <p class="lead mt-2">
          Acompanhe perfis, funções e acessos da comunidade Athena.
        </p>
      </header>

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

          <form
            class="form-grid mt-6"
            [formGroup]="provisionamentoForm"
            (ngSubmit)="provisionar()"
          >
            <div class="field">
              <label class="field__label" for="rgms">RGMs</label>
              <textarea
                id="rgms"
                class="control control--textarea"
                placeholder="Um RGM por linha — ex.: 20260009"
                formControlName="rgms"
                [class.control--invalid]="invalidoProvisionamento()"
              ></textarea>
              <span class="field__hint">
                Aceita vários RGMs de uma vez — separados por linha ou
                vírgula.
              </span>
              @if (invalidoProvisionamento()) {
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
                <th scope="col">Situação</th>
                <th scope="col"><span class="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (m of matriculas(); track m.rgm) {
                <tr>
                  <td class="cell-strong">{{ m.rgm }}</td>
                  <td>
                    @if (jaEhConta(m.rgm)) {
                      <span class="badge badge--primary">Já é uma conta</span>
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
                  <td class="table-empty" colspan="3">
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
              placeholder="Nome ou e-mail"
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
            <option value="PROFESSOR">Professor</option>
            <option value="COORDENADOR">Coordenador</option>
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

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">Usuário</th>
                <th scope="col">RGM</th>
                <th scope="col">E-mail</th>
                <th scope="col">Função</th>
                <th scope="col">Status</th>
                <th scope="col"><span class="sr-only">Ações</span></th>
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
                    <td class="cell-strong">{{ u.nome }}</td>
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
                    </td>
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
                          (click)="excluirUsuario(u.id)"
                          [attr.aria-label]="'Excluir usuário ' + u.nome"
                        >
                          <app-icone nome="lixeira" />
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              } @empty {
                <tr>
                  <td class="table-empty" colspan="6">
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
  private readonly fb = inject(FormBuilder);

  readonly rotuloCurso = rotuloCurso;

  readonly busca = signal('');
  readonly perfilFiltro = signal<Perfil | 'TODOS'>('TODOS');

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });

  /* ------------------------ pré-autorização por RGM ------------------------ */

  readonly matriculas = toSignal(this.matriculaService.listar(), {
    initialValue: [] as Matricula[],
  });

  readonly provisionamentoForm = this.fb.nonNullable.group({
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

  readonly usuarios = toSignal(
    toObservable(this.filtro).pipe(
      switchMap((f) => this.usuarioService.listar(f)),
    ),
    { initialValue: [] as Usuario[] },
  );

  /** Métricas sempre sobre a base inteira, independentes dos filtros. */
  private readonly todos = toSignal(this.usuarioService.listar(), {
    initialValue: [] as Usuario[],
  });

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

  jaEhConta(rgm: string): boolean {
    return this.todos().some((u) => u.rgm === rgm);
  }

  invalidoProvisionamento(): boolean {
    const c = this.provisionamentoForm.controls.rgms;
    return c.invalid && c.touched;
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

    const rgms = this.parseRgms(this.provisionamentoForm.getRawValue().rgms);

    if (rgms.length === 0) {
      this.erroProvisionamento.set(
        'Informe ao menos um RGM válido (só números).',
      );
      return;
    }

    this.provisionando.set(true);

    this.matriculaService.provisionar(rgms).subscribe({
      next: (resultado) => {
        this.provisionando.set(false);
        this.resultadoProvisionamento.set(resultado);
        this.provisionamentoForm.reset();
      },
      error: (e: Error) => {
        this.provisionando.set(false);
        this.erroProvisionamento.set(
          e.message || 'Não foi possível pré-autorizar os RGMs.',
        );
      },
    });
  }

  removerMatricula(rgm: string): void {
    this.matriculaService.remover([rgm]).subscribe();
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

  excluirUsuario(usuarioId: string): void {
    this.usuarioService.remover(usuarioId).subscribe();
  }
}
