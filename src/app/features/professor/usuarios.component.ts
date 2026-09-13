import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';

import { Perfil, ROTULO_PERFIL, Usuario, rotuloCurso } from '../../core/models';
import { CursoService } from '../../core/services/curso.service';
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

      <!-- --------------------------- novo usuário --------------------------- -->
      <section class="card">
        <div class="card__body">
          <h2 class="section-title">Novo usuário</h2>
          <p class="lead text-sm mt-1">
            Pré-cadastre um aluno pelo RGM. Ele já aparece na lista de
            integrantes disponíveis para montar um PFC.
          </p>

          @if (sucesso()) {
            <p class="ok" role="status">
              <app-icone nome="check" />
              Usuário cadastrado com sucesso.
            </p>
          }

          @if (erro()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erro() }}</span>
            </p>
          }

          <form
            class="form-grid form-grid--2 mt-6"
            [formGroup]="form"
            (ngSubmit)="cadastrar()"
          >
            <div class="field">
              <label class="field__label" for="rgm">RGM</label>
              <input
                id="rgm"
                type="text"
                inputmode="numeric"
                class="control"
                placeholder="Ex.: 20240001"
                formControlName="rgm"
                [class.control--invalid]="invalido('rgm')"
              />
              @if (invalido('rgm')) {
                <span class="field__error">
                  Informe um RGM válido (só números, 4 a 12 dígitos).
                </span>
              }
            </div>

            <div class="field">
              <label class="field__label" for="nome">Nome completo</label>
              <input
                id="nome"
                type="text"
                class="control"
                placeholder="Nome do aluno"
                formControlName="nome"
                [class.control--invalid]="invalido('nome')"
              />
              @if (invalido('nome')) {
                <span class="field__error">Informe o nome completo.</span>
              }
            </div>

            <div class="field">
              <label class="field__label" for="turma">Turma</label>
              <select
                id="turma"
                class="control"
                formControlName="cursoId"
                [class.control--invalid]="invalido('cursoId')"
              >
                <option value="">Selecione a turma</option>
                @for (c of cursos(); track c.id) {
                  <option [value]="c.id">{{ rotuloCurso(c) }}</option>
                }
              </select>
              @if (invalido('cursoId')) {
                <span class="field__error">Escolha a turma do aluno.</span>
              }
            </div>

            <div class="form-grid__full">
              <button
                type="submit"
                class="btn btn--primary"
                [disabled]="salvando()"
              >
                <app-icone nome="mais" class="btn__icon" />
                {{ salvando() ? 'Cadastrando…' : 'Cadastrar usuário' }}
              </button>
            </div>
          </form>
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
              </tr>
            </thead>
            <tbody>
              @for (u of usuarios(); track u.id) {
                <tr>
                  <td class="cell-strong">{{ u.nome }}</td>
                  <td>{{ u.rgm ?? '—' }}</td>
                  <td>{{ u.email }}</td>
                  <td>
                    <span
                      class="badge"
                      [class]="
                        u.perfil === 'PROFESSOR'
                          ? 'badge--primary'
                          : 'badge--muted'
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
                </tr>
              } @empty {
                <tr>
                  <td class="table-empty" colspan="5">
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
  `,
})
export class UsuariosComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly cursoService = inject(CursoService);
  private readonly fb = inject(FormBuilder);

  readonly rotuloCurso = rotuloCurso;

  readonly busca = signal('');
  readonly perfilFiltro = signal<Perfil | 'TODOS'>('TODOS');

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });

  readonly form = this.fb.nonNullable.group({
    rgm: ['', [Validators.required, Validators.pattern(/^\d{4,12}$/)]],
    nome: ['', [Validators.required, Validators.minLength(3)]],
    cursoId: ['', [Validators.required]],
  });

  readonly salvando = signal(false);
  readonly sucesso = signal(false);
  readonly erro = signal('');

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
    () => this.todos().filter((u) => u.perfil === 'PROFESSOR').length,
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

  invalido(campo: 'rgm' | 'nome' | 'cursoId'): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && controle.touched;
  }

  cadastrar(): void {
    this.sucesso.set(false);
    this.erro.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    const { rgm, nome, cursoId } = this.form.getRawValue();

    this.usuarioService.criarPorProfessor({ rgm, nome, cursoId }).subscribe({
      next: () => {
        this.salvando.set(false);
        this.sucesso.set(true);
        this.form.reset();
      },
      error: (e: Error) => {
        this.salvando.set(false);
        this.erro.set(e.message || 'Não foi possível cadastrar o usuário.');
      },
    });
  }
}
