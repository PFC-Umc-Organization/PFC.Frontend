import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, of, switchMap } from 'rxjs';

import { Projeto, ProjetoDetalhe, Usuario } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { IconeComponent } from '../../shared/components/icone.component';

@Component({
  selector: 'app-meu-pfc',
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Meu grupo</p>
        <h1 class="page-title mt-2">PFC</h1>
        <p class="lead mt-2">
          Cadastre o seu Projeto Final de Curso e monte o grupo com colegas já
          pré-cadastrados pelo professor.
        </p>
      </header>

      @if (ehPreviaDoProfessor()) {
        <p class="aviso">
          <app-icone nome="alerta" />
          <span>
            Prévia da visão do aluno. Como professor, você não pode cadastrar
            ou alterar um PFC por aqui.
          </span>
        </p>
      } @else if (meuProjetoDetalhe(); as detalhe) {
        <!-- ------------------------- já tem PFC ------------------------- -->
        <section class="card">
          <div class="card__body">
            <p class="eyebrow">Projeto cadastrado</p>
            <h2 class="page-title mt-2">{{ detalhe.projeto.nome }}</h2>
            <p class="lead mt-2">{{ detalhe.projeto.descricao }}</p>
          </div>
        </section>

        <section class="card card--flush">
          <div class="card__head">
            <app-icone nome="usuarios" class="card__head-icone" />
            <h2 class="section-title">Integrantes do grupo</h2>
          </div>
          <ul class="integrantes__lista">
            @for (i of detalhe.integrantes; track i.id) {
              <li class="integrante">
                <app-icone nome="usuarios" class="integrante__icone" />
                <span>
                  <span class="cell-strong">{{ i.nome }}</span>
                  <span class="integrante__email">{{ i.email }}</span>
                </span>
              </li>
            }
          </ul>
        </section>

        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Adicionar integrante</h2>
            <p class="lead text-sm mt-1">
              Só aparecem aqui alunos do seu curso, já cadastrados pelo
              professor, que ainda não têm grupo.
            </p>

            @if (erroIntegrante()) {
              <p class="alerta" role="alert">
                <app-icone nome="alerta" />
                <span>{{ erroIntegrante() }}</span>
              </p>
            }

            @if (candidatos().length === 0) {
              <p class="lead text-sm mt-4">
                Nenhum colega disponível no momento.
              </p>
            } @else {
              <div class="row row--wrap mt-4">
                <select
                  class="control"
                  [value]="integranteEscolhido()"
                  (change)="escolherIntegrante($event)"
                >
                  <option value="">Selecione um colega</option>
                  @for (c of candidatos(); track c.id) {
                    <option [value]="c.id">
                      {{ c.nome }} — RGM {{ c.rgm ?? '—' }}
                    </option>
                  }
                </select>
                <button
                  type="button"
                  class="btn btn--primary"
                  [disabled]="!integranteEscolhido() || adicionando()"
                  (click)="adicionarIntegrante()"
                >
                  <app-icone nome="mais" class="btn__icon" />
                  {{ adicionando() ? 'Adicionando…' : 'Adicionar' }}
                </button>
              </div>
            }
          </div>
        </section>
      } @else {
        <!-- ------------------------ cadastrar PFC ------------------------ -->
        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Cadastrar meu PFC</h2>
            <p class="lead text-sm mt-1">
              Esse cadastro só pode ser feito uma vez — revise antes de
              enviar.
            </p>

            @if (erro()) {
              <p class="alerta" role="alert">
                <app-icone nome="alerta" />
                <span>{{ erro() }}</span>
              </p>
            }

            <form
              class="form-grid form-grid--2 mt-6"
              [formGroup]="form"
              (ngSubmit)="cadastrarPfc()"
            >
              <div class="field form-grid__full">
                <label class="field__label" for="nome">Nome do PFC</label>
                <input
                  id="nome"
                  type="text"
                  class="control"
                  placeholder="Ex.: Athena"
                  formControlName="nome"
                  [class.control--invalid]="invalido('nome')"
                />
                @if (invalido('nome')) {
                  <span class="field__error">Informe o nome do projeto.</span>
                }
              </div>

              <div class="field form-grid__full">
                <label class="field__label" for="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  class="control control--textarea"
                  placeholder="Do que se trata o seu PFC?"
                  formControlName="descricao"
                ></textarea>
              </div>

              <div class="field form-grid__full">
                <label class="field__label">
                  Integrantes (além de você)
                </label>
                @if (candidatos().length === 0) {
                  <p class="lead text-sm">
                    Nenhum colega do seu curso está disponível ainda. Peça
                    para o professor cadastrá-los em Usuários.
                  </p>
                } @else {
                  <ul class="checklist">
                    @for (c of candidatos(); track c.id) {
                      <li>
                        <label class="checklist__item">
                          <input
                            type="checkbox"
                            [checked]="estaSelecionado(c.id)"
                            (change)="alternarIntegrante(c.id)"
                          />
                          <span>
                            {{ c.nome }}
                            <span class="muted text-xs">
                              RGM {{ c.rgm ?? '—' }}
                            </span>
                          </span>
                        </label>
                      </li>
                    }
                  </ul>
                }
              </div>

              <div class="form-grid__full">
                <button
                  type="submit"
                  class="btn btn--primary"
                  [disabled]="salvando()"
                >
                  <app-icone nome="mais" class="btn__icon" />
                  {{ salvando() ? 'Cadastrando…' : 'Cadastrar PFC' }}
                </button>
              </div>
            </form>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .card__head-icone {
      --icone-size: 1.125rem;
      color: var(--primary);
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

    .integrantes__lista {
      display: grid;
      gap: 0.75rem;
      margin: 0;
      padding: 1.25rem;
      list-style: none;
    }

    .integrante {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .integrante__icone {
      --icone-size: 1rem;
      color: var(--bronze);
      margin-top: 0.125rem;
    }

    .integrante__email {
      display: block;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .checklist {
      display: grid;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .checklist__item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      background: var(--marble);
      border: 1px solid color-mix(in oklch, var(--primary) 15%, transparent);
    }

    .row select.control {
      width: auto;
      min-width: 16rem;
    }
  `,
})
export class MeuPfcComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly projetoService = inject(ProjetoService);
  private readonly usuarioService = inject(UsuarioService);

  readonly ehPreviaDoProfessor = computed(
    () => this.auth.ehProfessor() && this.auth.perfilVisao() === 'ALUNO',
  );

  private readonly meuId = computed(() => this.auth.usuario()?.id ?? '');
  private readonly meuCursoId = computed(
    () => this.auth.usuario()?.cursoIds.at(0) ?? '',
  );

  private readonly meuProjetoBase = toSignal(
    toObservable(this.meuId).pipe(
      switchMap((id) => (id ? this.projetoService.doAluno(id) : of(null))),
    ),
    { initialValue: null as Projeto | null },
  );

  readonly meuProjetoDetalhe = toSignal(
    toObservable(computed(() => this.meuProjetoBase()?.id ?? '')).pipe(
      switchMap((id) => (id ? this.projetoService.detalhe(id) : of(null))),
    ),
    { initialValue: null as ProjetoDetalhe | null },
  );

  private readonly alunosDoCurso = toSignal(
    toObservable(this.meuCursoId).pipe(
      switchMap((cursoId) =>
        this.usuarioService
          .listar({ perfil: 'ALUNO' })
          .pipe(
            map((alunos) => alunos.filter((a) => a.cursoIds.includes(cursoId))),
          ),
      ),
    ),
    { initialValue: [] as Usuario[] },
  );

  private readonly todosProjetos = toSignal(this.projetoService.listar(), {
    initialValue: [] as Projeto[],
  });

  /** Alunos do meu curso que ainda não têm grupo — nem eu mesmo. */
  readonly candidatos = computed(() => {
    const alocados = new Set(
      this.todosProjetos().flatMap((p) => p.integrantes),
    );
    const euId = this.meuId();

    return this.alunosDoCurso().filter(
      (a) => !alocados.has(a.id) && a.id !== euId,
    );
  });

  private readonly selecionados = signal<Set<string>>(new Set());

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    descricao: [''],
  });

  readonly salvando = signal(false);
  readonly erro = signal('');

  readonly integranteEscolhido = signal('');
  readonly adicionando = signal(false);
  readonly erroIntegrante = signal('');

  invalido(campo: 'nome'): boolean {
    const controle = this.form.controls[campo];
    return controle.invalid && controle.touched;
  }

  estaSelecionado(id: string): boolean {
    return this.selecionados().has(id);
  }

  alternarIntegrante(id: string): void {
    const atual = new Set(this.selecionados());

    if (atual.has(id)) {
      atual.delete(id);
    } else {
      atual.add(id);
    }

    this.selecionados.set(atual);
  }

  cadastrarPfc(): void {
    this.erro.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const cursoId = this.meuCursoId();
    const euId = this.meuId();

    if (!cursoId || !euId) {
      return;
    }

    this.salvando.set(true);
    const { nome, descricao } = this.form.getRawValue();

    this.projetoService
      .criar({
        nome,
        descricao,
        cursoId,
        integrantes: [euId, ...Array.from(this.selecionados())],
      })
      .subscribe({
        next: () => this.salvando.set(false),
        error: (e: Error) => {
          this.salvando.set(false);
          this.erro.set(e.message || 'Não foi possível cadastrar o PFC.');
        },
      });
  }

  escolherIntegrante(evento: Event): void {
    this.integranteEscolhido.set((evento.target as HTMLSelectElement).value);
  }

  adicionarIntegrante(): void {
    const projeto = this.meuProjetoBase();
    const alunoId = this.integranteEscolhido();

    if (!projeto || !alunoId) {
      return;
    }

    this.erroIntegrante.set('');
    this.adicionando.set(true);

    this.projetoService.adicionarIntegrante(projeto.id, alunoId).subscribe({
      next: () => {
        this.adicionando.set(false);
        this.integranteEscolhido.set('');
      },
      error: (e: Error) => {
        this.adicionando.set(false);
        this.erroIntegrante.set(
          e.message || 'Não foi possível adicionar o integrante.',
        );
      },
    });
  }
}
