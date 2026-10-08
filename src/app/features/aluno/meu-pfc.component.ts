import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, combineLatest, of, switchMap } from 'rxjs';

import { Projeto, ProjetoDetalhe, rgmDoUsuario } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { IconeComponent } from '../../shared/components/icone.component';


@Component({
  selector: 'app-meu-pfc',
  standalone: true,
  imports: [IconeComponent, ReactiveFormsModule],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Meu grupo</p>
        <h1 class="page-title mt-2">PFC</h1>
        <p class="lead mt-2">
          Crie o projeto do seu grupo e acompanhe o orientador definido pela
          coordenação.
        </p>
      </header>

      @if (meuProjetoDetalhe(); as detalhe) {
        <section class="card">
          <div class="card__body">
            <p class="eyebrow">Projeto cadastrado</p>
            <h2 class="page-title mt-2">{{ detalhe.projeto.nome }}</h2>
            <p class="lead mt-2">{{ detalhe.projeto.descricao }}</p>
            <p class="text-sm mt-4">
              <span class="cell-strong">Orientador: </span>
              @if (detalhe.orientador) {
                {{ detalhe.orientador.nome }}
              } @else {
                <span class="muted">
                  Ainda não definido pelo coordenador de PFC.
                </span>
              }
            </p>
          </div>
        </section>

        <section class="card card--flush">
          <div class="card__head">
            <app-icone nome="usuarios" class="card__head-icone" />
            <h2 class="section-title">Integrantes do grupo</h2>
          </div>
          <ul class="integrantes__lista">
            @for (i of detalhe.integrantes; track i.rgm) {
              <li class="integrante">
                <app-icone nome="usuarios" class="integrante__icone" />
                <span>
                  @if (i.nome) {
                    <span class="cell-strong">{{ i.nome }}</span>
                  } @else {
                    <span class="cell-strong muted">
                      RGM {{ i.rgm }} (aguardando cadastro)
                    </span>
                  }
                </span>
              </li>
            }
          </ul>
        </section>
      } @else {
        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Criar o PFC do meu grupo</h2>
            <p class="lead mt-2">
              Você ainda não faz parte de um PFC. Dê um nome ao projeto e
              informe o RGM dos colegas — você entra no grupo automaticamente.
              Todos precisam estar pré-autorizados na sua turma e sem outro
              projeto.
            </p>

            <form
              class="form-grid form-grid--2 mt-6"
              [formGroup]="form"
              (ngSubmit)="criar()"
            >
              <div class="field">
                <label class="field__label" for="pfc-nome">Nome do projeto</label>
                <input
                  id="pfc-nome"
                  type="text"
                  class="control"
                  placeholder="Ex.: Athena"
                  formControlName="nome"
                  [class.control--invalid]="nomeInvalido()"
                />
                @if (nomeInvalido()) {
                  <span class="field__error">Informe o nome do projeto.</span>
                }
              </div>

              <div class="field">
                <label class="field__label" for="pfc-colegas">
                  RGM dos colegas (separados por vírgula)
                </label>
                <input
                  id="pfc-colegas"
                  type="text"
                  class="control"
                  placeholder="Ex.: 12345678, 87654321"
                  formControlName="colegas"
                />
              </div>

              <div class="field form-grid__full">
                <label class="field__label" for="pfc-descricao">Descrição</label>
                <textarea
                  id="pfc-descricao"
                  class="control control--textarea"
                  placeholder="Do que se trata o projeto."
                  formControlName="descricao"
                ></textarea>
              </div>

              <div class="form-grid__full">
                <button type="submit" class="btn btn--primary" [disabled]="criando()">
                  <app-icone nome="mais" class="btn__icon" />
                  {{ criando() ? 'Criando…' : 'Criar PFC' }}
                </button>
                @if (erro()) {
                  <p class="erro-criar" role="alert">{{ erro() }}</p>
                }
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

    .erro-criar {
      margin-top: 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--destructive);
    }

    .integrante__icone {
      --icone-size: 1rem;
      color: var(--bronze);
      margin-top: 0.125rem;
    }
  `,
})
export class MeuPfcComponent {
  private readonly auth = inject(AuthService);
  private readonly projetoService = inject(ProjetoService);

  /** `integrantes` guarda RGM, não `Usuario.id` — a busca é pelo RGM do aluno. */
  private readonly meuRgm = computed(() => rgmDoUsuario(this.auth.usuario()));

  private readonly fb = inject(FormBuilder);
  private readonly recarregar$ = new BehaviorSubject<void>(undefined);

  private readonly meuProjetoBase = toSignal(
    combineLatest([toObservable(this.meuRgm), this.recarregar$]).pipe(
      switchMap(([rgm]) => (rgm ? this.projetoService.doAluno(rgm) : of(null))),
    ),
    { initialValue: null as Projeto | null },
  );

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    descricao: [''],
    colegas: [''],
  });
  readonly criando = signal(false);
  readonly erro = signal('');

  nomeInvalido(): boolean {
    const c = this.form.controls.nome;
    return c.invalid && c.touched;
  }

  criar(): void {
    this.erro.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, descricao, colegas } = this.form.getRawValue();
    this.criando.set(true);

    this.projetoService
      .criarDoAluno({
        nome,
        descricao,
        integrantes: colegas
          .split(/[\s,;]+/)
          .map((r) => r.trim())
          .filter(Boolean),
      })
      .subscribe({
        next: () => {
          this.criando.set(false);
          this.recarregar$.next();
        },
        error: (e: Error) => {
          this.criando.set(false);
          this.erro.set(e.message);
        },
      });
  }

  readonly meuProjetoDetalhe = toSignal(
    toObservable(computed(() => this.meuProjetoBase()?.id ?? '')).pipe(
      switchMap((id) => (id ? this.projetoService.detalhe(id) : of(null))),
    ),
    { initialValue: null as ProjetoDetalhe | null },
  );
}
