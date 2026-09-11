import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { Perfil, ROTULO_PERFIL, Usuario } from '../../core/models';
import { UsuarioService } from '../../core/services/usuario.service';
import { IconeComponent } from '../../shared/components/icone.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [IconeComponent],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Administração</p>
        <h1 class="page-title mt-2">Gerenciamento de Usuários</h1>
        <p class="lead mt-2">
          Acompanhe perfis, funções e acessos da comunidade Athena.
        </p>
      </header>

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
                <th scope="col">E-mail</th>
                <th scope="col">Função</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (u of usuarios(); track u.id) {
                <tr>
                  <td class="cell-strong">{{ u.nome }}</td>
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
                  <td class="table-empty" colspan="4">
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

  readonly busca = signal('');
  readonly perfilFiltro = signal<Perfil | 'TODOS'>('TODOS');

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
}
