import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, catchError, combineLatest, of, switchMap } from 'rxjs';

import {
  Convite,
  LIMITES_PROJETO,
  Projeto,
  ProjetoDetalhe,
  colegasDoFormulario,
  rgmDoUsuario,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { ConviteService } from '../../core/services/convite.service';
import { ProgramaService } from '../../core/services/programa.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { IconeComponent } from '../../shared/components/icone.component';


@Component({
  selector: 'app-meu-pfc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [DatePipe, IconeComponent, ReactiveFormsModule],
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

        <section class="card card--flush">
          <div class="card__head">
            <app-icone nome="email" class="card__head-icone" />
            <h2 class="section-title">Convites pendentes</h2>
          </div>
          <div class="card__body convites">
            @if (pendentes().length) {
              <ul class="convites__lista">
                @for (c of pendentes(); track c.rgm) {
                  <li class="convite">
                    <span class="convite__texto">
                      <span class="cell-strong">RGM {{ c.rgm }}</span>
                      <span class="muted text-sm">
                        convidado em {{ c.criadoEm | date: 'dd/MM/yyyy' }}
                      </span>
                    </span>
                    <button
                      type="button"
                      class="btn btn--outline btn--sm"
                      [disabled]="ocupado()"
                      (click)="cancelar(c)"
                    >
                      <app-icone nome="lixeira" class="btn__icon" />
                      Cancelar
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p class="muted text-sm">
                Nenhum convite esperando resposta. Os colegas entram no grupo
                quando aceitam o convite na tela deles.
              </p>
            }

            <form class="convidar" [formGroup]="conviteForm" (ngSubmit)="convidar()">
              <div class="field convidar__campo">
                <label class="field__label" for="convite-rgm">
                  Convidar colega (RGM)
                </label>
                <input
                  id="convite-rgm"
                  type="text"
                  inputmode="numeric"
                  class="control"
                  placeholder="Ex.: 12345678"
                  formControlName="rgm"
                />
              </div>
              <button type="submit" class="btn btn--primary" [disabled]="ocupado()">
                <app-icone nome="mais" class="btn__icon" />
                {{ convidando() ? 'Convidando…' : 'Convidar' }}
              </button>
            </form>
            @if (erroGrupo()) {
              <p class="erro-criar" role="alert">{{ erroGrupo() }}</p>
            }
          </div>
        </section>
      } @else {
        @if (meusConvites().length) {
          <section class="card card--flush">
            <div class="card__head">
              <app-icone nome="email" class="card__head-icone" />
              <h2 class="section-title">Convites recebidos</h2>
            </div>
            <div class="card__body convites">
              <p class="muted text-sm">
                Aceitar coloca você no grupo. Você só pode participar de um
                PFC, então os outros convites somem.
              </p>
              <ul class="convites__lista">
                @for (c of meusConvites(); track c.projetoId) {
                  <li class="convite">
                    <span class="convite__texto">
                      <span class="cell-strong">{{ c.projetoNome }}</span>
                      <span class="muted text-sm">
                        convidado por {{ c.convidadoPor || 'um colega' }} em
                        {{ c.criadoEm | date: 'dd/MM/yyyy' }}
                      </span>
                    </span>
                    <span class="convite__acoes">
                      <button
                        type="button"
                        class="btn btn--outline btn--sm"
                        [disabled]="ocupado()"
                        (click)="recusar(c)"
                      >
                        Recusar
                      </button>
                      <button
                        type="button"
                        class="btn btn--primary btn--sm"
                        [disabled]="ocupado()"
                        (click)="aceitar(c)"
                      >
                        <app-icone nome="check" class="btn__icon" />
                        {{ aceitandoId() === c.projetoId ? 'Entrando…' : 'Aceitar' }}
                      </button>
                    </span>
                  </li>
                }
              </ul>
              @if (erroConvite()) {
                <p class="erro-criar" role="alert">{{ erroConvite() }}</p>
              }
            </div>
          </section>
        }

        @switch (situacao()) {
          @case ('sem-turma') {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>
                O seu RGM ainda não está pré-autorizado em nenhuma turma, então
                ainda não dá para criar o PFC. Fale com a coordenação. Se ela
                acabou de liberar, recarregue a página.
              </span>
            </p>
          }
          @case ('sem-programa') {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>
                A sua turma ainda não tem PFC iniciado. Assim que a coordenação
                criar o programa de PFC da turma, você poderá criar o projeto do
                seu grupo aqui.
              </span>
            </p>
          }
          @case ('carregando') {
            <p class="muted text-sm">Verificando a sua turma…</p>
          }
          @default {
        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Criar o PFC do meu grupo</h2>
            <p class="lead mt-2">
              Você ainda não faz parte de um PFC. Dê um nome ao projeto e
              informe o RGM dos colegas: você entra no grupo na hora e cada
              colega recebe um convite para aceitar. Todos precisam estar
              pré-autorizados na sua turma e sem outro projeto.
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
                  <span class="field__error">
                    Informe um nome de 3 a 150 caracteres.
                  </span>
                }
              </div>

              <div class="field">
                <label class="field__label" for="pfc-colegas">
                  RGM dos colegas a convidar (separados por vírgula)
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
                  [class.control--invalid]="descricaoInvalida()"
                ></textarea>
                @if (descricaoInvalida()) {
                  <span class="field__error">
                    A descrição pode ter até 2.000 caracteres.
                  </span>
                }
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
        }
      }
    </div>
  `,
  styles: `
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

    .convites {
      display: grid;
      gap: 1rem;
    }

    .convites__lista {
      display: grid;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .convite {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .convite__texto {
      display: grid;
      gap: 0.125rem;
      min-width: 0;
    }

    .convite__acoes {
      display: flex;
      gap: 0.5rem;
    }

    .convidar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem;
    }

    .convidar__campo {
      flex: 1 1 14rem;
      min-width: 0;
    }
  `,
})
export class MeuPfcComponent {
  private readonly auth = inject(AuthService);
  private readonly projetoService = inject(ProjetoService);
  private readonly programaService = inject(ProgramaService);
  private readonly conviteService = inject(ConviteService);
  private readonly confirmacao = inject(ConfirmacaoService);

  /** `integrantes` guarda RGM, não `Usuario.id` — a busca é pelo RGM do aluno. */
  private readonly meuRgm = computed(() => rgmDoUsuario(this.auth.usuario()));

  private readonly fb = inject(FormBuilder);
  private readonly recarregar$ = new BehaviorSubject<void>(undefined);
  private readonly recarregarConvites$ = new BehaviorSubject<void>(undefined);

  private readonly meuProjetoBase = toSignal(
    combineLatest([toObservable(this.meuRgm), this.recarregar$]).pipe(
      switchMap(([rgm]) => (rgm ? this.projetoService.doAluno(rgm) : of(null))),
    ),
    { initialValue: null as Projeto | null },
  );

  /**
   * A turma vem da sessão (gravada no login): se a coordenação pré-autorizar
   * o aluno depois, a tela só sabe quando ele entra de novo.
   */
  private readonly minhaTurmaId = computed(
    () => this.auth.usuario()?.cursoIds?.[0] ?? '',
  );

  /** `undefined` enquanto carrega; `null` se falhar (aí o backend decide no envio). */
  private readonly programas = toSignal(
    this.programaService.listar().pipe(catchError(() => of(null))),
    { initialValue: undefined },
  );

  /** Só oferece o formulário a quem pode criar; os outros casos viram aviso. */
  readonly situacao = computed<'carregando' | 'sem-turma' | 'sem-programa' | 'pode-criar'>(
    () => {
      const turmaId = this.minhaTurmaId();
      if (!turmaId) {
        return 'sem-turma';
      }
      const programas = this.programas();
      if (programas === undefined) {
        return 'carregando';
      }
      if (programas === null) {
        return 'pode-criar';
      }
      return programas.some((p) => p.cursoId === turmaId) ? 'pode-criar' : 'sem-programa';
    },
  );

  readonly form = this.fb.nonNullable.group({
    nome: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(LIMITES_PROJETO.nome),
      ],
    ],
    descricao: ['', [Validators.maxLength(LIMITES_PROJETO.descricao)]],
    colegas: [''],
  });
  readonly criando = signal(false);
  readonly erro = signal('');

  nomeInvalido(): boolean {
    const c = this.form.controls.nome;
    return c.invalid && c.touched;
  }

  descricaoInvalida(): boolean {
    const c = this.form.controls.descricao;
    return c.invalid && c.touched;
  }

  criar(): void {
    this.erro.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, descricao, colegas } = this.form.getRawValue();
    const lidos = colegasDoFormulario(colegas, this.meuRgm());
    if ('erro' in lidos) {
      this.erro.set(lidos.erro);
      return;
    }
    this.criando.set(true);

    this.projetoService
      .criarDoAluno({
        nome: nome.trim(),
        descricao: descricao.trim(),
        integrantes: lidos.rgms,
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

  // ── Convites (atividade 8) ──────────────────────────────────────────────

  /**
   * Enquanto uma resposta/convite está a caminho, todos os botões de convite
   * ficam travados: evita duplo clique e aceitar dois grupos ao mesmo tempo.
   */
  readonly aceitandoId = signal<string | null>(null);
  readonly respondendo = signal(false);
  readonly convidando = signal(false);
  readonly ocupado = computed(
    () => this.respondendo() || this.convidando() || this.aceitandoId() !== null,
  );
  readonly erroConvite = signal('');
  readonly erroGrupo = signal('');

  /** Convites que o aluno logado recebeu (só aparecem enquanto ele não tem grupo). */
  readonly meusConvites = toSignal(
    combineLatest([toObservable(this.meuRgm), this.recarregarConvites$]).pipe(
      switchMap(([rgm]) =>
        rgm
          ? this.conviteService.meusConvites().pipe(catchError(() => of([] as Convite[])))
          : of([] as Convite[]),
      ),
    ),
    { initialValue: [] as Convite[] },
  );

  /** Convites que o grupo mandou e ninguém respondeu ainda. */
  readonly pendentes = toSignal(
    combineLatest([
      toObservable(computed(() => this.meuProjetoBase()?.id ?? '')),
      this.recarregarConvites$,
    ]).pipe(
      switchMap(([id]) =>
        id
          ? this.conviteService.doGrupo(id).pipe(catchError(() => of([] as Convite[])))
          : of([] as Convite[]),
      ),
    ),
    { initialValue: [] as Convite[] },
  );

  readonly conviteForm = this.fb.nonNullable.group({
    rgm: ['', Validators.required],
  });

  aceitar(c: Convite): void {
    this.erroConvite.set('');
    this.aceitandoId.set(c.projetoId);
    this.conviteService.aceitar(c.projetoId).subscribe({
      next: () => {
        this.aceitandoId.set(null);
        this.recarregar$.next();
        this.recarregarConvites$.next();
      },
      error: (e: Error) => {
        this.aceitandoId.set(null);
        this.erroConvite.set(e.message);
        this.recarregarConvites$.next();
      },
    });
  }

  async recusar(c: Convite): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Recusar convite',
      mensagem: `Recusar o convite para o grupo "${c.projetoNome}"? Para entrar depois, alguém do grupo precisa convidar você de novo.`,
      textoConfirmar: 'Recusar',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }

    this.erroConvite.set('');
    this.respondendo.set(true);
    this.conviteService.recusar(c.projetoId).subscribe({
      next: () => {
        this.respondendo.set(false);
        this.recarregarConvites$.next();
      },
      error: (e: Error) => {
        this.respondendo.set(false);
        this.erroConvite.set(e.message);
      },
    });
  }

  convidar(): void {
    const projetoId = this.meuProjetoBase()?.id;
    const rgm = this.conviteForm.controls.rgm.value.trim();
    this.erroGrupo.set('');
    if (!projetoId || !rgm) {
      this.erroGrupo.set('Informe o RGM do colega.');
      return;
    }

    this.convidando.set(true);
    this.conviteService.convidar(projetoId, rgm).subscribe({
      next: () => {
        this.convidando.set(false);
        this.conviteForm.reset();
        this.recarregarConvites$.next();
      },
      error: (e: Error) => {
        this.convidando.set(false);
        this.erroGrupo.set(e.message);
      },
    });
  }

  async cancelar(c: Convite): Promise<void> {
    const projetoId = this.meuProjetoBase()?.id;
    if (!projetoId) {
      return;
    }
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Cancelar convite',
      mensagem: `Cancelar o convite do RGM ${c.rgm}? Ele deixa de aparecer na tela dessa pessoa.`,
      textoConfirmar: 'Cancelar convite',
      textoCancelar: 'Voltar',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }

    this.erroGrupo.set('');
    this.respondendo.set(true);
    this.conviteService.cancelar(projetoId, c.rgm).subscribe({
      next: () => {
        this.respondendo.set(false);
        this.recarregarConvites$.next();
      },
      error: (e: Error) => {
        this.respondendo.set(false);
        this.erroGrupo.set(e.message);
      },
    });
  }
}
