import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';

import {
  ArtigoEncontrado,
  Projeto,
  Referencia,
  ReferenciaFormatada,
  autoriaCurta,
  ehEquipeAcademica,
  rgmDoUsuario,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { ReferenciaService } from '../../core/services/referencia.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { ListaReferenciasComponent } from './lista-referencias.component';

type ModoBusca = 'tema' | 'doi';

/**
 * Referências bibliográficas do PFC.
 *
 * Aluno: pesquisa artigos (por tema na OpenAlex ou pelo DOI no Crossref,
 * ambos via backend) e monta a lista de referências do grupo, já em ABNT.
 * Equipe acadêmica: escolhe um PFC e acompanha a lista, sem editar.
 */
@Component({
  selector: 'app-referencias',
  standalone: true,
  imports: [NgTemplateOutlet, IconeComponent, ListaReferenciasComponent],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Pesquisa</p>
        <h1 class="page-title mt-2">Referências</h1>
        <p class="lead mt-2">
          @if (visaoProfessor()) {
            Acompanhe a bibliografia que cada grupo está montando para o PFC.
          } @else {
            Encontre artigos acadêmicos e monte a lista de referências do seu
            PFC já formatada nas normas da ABNT.
          }
        </p>
      </header>

      @if (visaoProfessor()) {
        <!-- ------------------------ visão professor ------------------------ -->
        <section class="card">
          <div class="card__body">
            <div class="field seletor">
              <label class="field__label" for="projeto">PFC</label>
              <select
                id="projeto"
                class="control"
                [value]="projetoAlvoId()"
                (change)="aoTrocarProjeto($event)"
              >
                @for (p of projetos(); track p.id) {
                  <option [value]="p.id">{{ p.nome }}</option>
                } @empty {
                  <option value="">Nenhum PFC cadastrado</option>
                }
              </select>
            </div>
          </div>
        </section>

        @if (projetoAlvoId()) {
          <app-lista-referencias
            [referencias]="referencias()"
            [nomeProjeto]="projetoAlvo()?.nome ?? ''"
            [carregando]="carregandoLista()"
            [erro]="erroLista()"
            [aviso]="avisoLista()"
            [copiado]="copiado()"
            (copiar)="copiar($event)"
            (copiarTodas)="copiarTodas()"
          />
        }
      } @else {
        <!-- -------------------------- visão aluno -------------------------- -->
        @if (!projetoAlvoId()) {
          <p class="aviso">
            Você ainda não foi alocado a um PFC. Dá para pesquisar artigos, mas
            a lista de referências é do grupo — fale com a coordenação para
            entrar em um.
          </p>
        }

        <section class="card">
          <div class="card__body stack">
            <div class="segmented segmented--grid modos" role="tablist" aria-label="Forma de busca">
              <button
                type="button"
                role="tab"
                class="segmented__item"
                [attr.aria-selected]="modo() === 'tema'"
                (click)="modo.set('tema')"
              >
                Buscar por tema
              </button>
              <button
                type="button"
                role="tab"
                class="segmented__item"
                [attr.aria-selected]="modo() === 'doi'"
                (click)="modo.set('doi')"
              >
                Tenho o DOI
              </button>
            </div>

            @if (modo() === 'tema') {
              <form class="busca" (submit)="buscar($event)">
                <div class="control-wrap busca__campo">
                  <app-icone nome="busca" class="control-wrap__icon" />
                  <input
                    type="search"
                    class="control"
                    placeholder="Ex.: gerenciamento de projetos de software"
                    aria-label="Tema da pesquisa"
                    maxlength="200"
                    [value]="termo()"
                    (input)="termo.set(valor($event))"
                  />
                </div>
                <button
                  type="submit"
                  class="btn btn--primary"
                  [disabled]="termo().trim().length < 3 || buscando()"
                >
                  {{ buscando() && pagina() === 1 ? 'Buscando…' : 'Buscar' }}
                </button>
              </form>

              @if (erroBusca()) {
                <p class="erro" role="alert">{{ erroBusca() }}</p>
              }

              @if (buscou() && !erroBusca()) {
                <p class="text-sm muted" aria-live="polite">
                  {{ numero(total()) }}
                  {{ total() === 1 ? 'resultado' : 'resultados' }} · fonte:
                  OpenAlex
                </p>

                <ul class="resultados">
                  @for (a of artigos(); track $index) {
                    <li class="artigo">
                      <div class="artigo__texto">
                        <h3 class="artigo__titulo">{{ a.titulo }}</h3>
                        <p class="text-sm muted">{{ autoria(a.autores) }}</p>
                        <p class="text-xs muted">
                          {{ detalhes(a) }}
                        </p>
                      </div>
                      <div class="artigo__acoes">
                        @if (a.url) {
                          <a
                            class="btn btn--ghost btn--sm"
                            [href]="a.url"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir
                            <app-icone nome="link-externo" class="btn__icon" />
                          </a>
                        }
                        @if (projetoAlvoId()) {
                          <ng-container
                            *ngTemplateOutlet="botaoAdicionar; context: { $implicit: a.doi }"
                          />
                        }
                      </div>
                    </li>
                  } @empty {
                    <li class="vazio">
                      Nenhum artigo encontrado. Tente outras palavras-chave.
                    </li>
                  }
                </ul>

                @if (artigos().length < total()) {
                  <button
                    type="button"
                    class="btn btn--outline carregar-mais"
                    [disabled]="buscando()"
                    (click)="carregarMais()"
                  >
                    {{ buscando() ? 'Carregando…' : 'Carregar mais' }}
                  </button>
                }
              }
            } @else {
              <form class="busca" (submit)="consultarDoi($event)">
                <div class="busca__campo">
                  <input
                    type="text"
                    class="control"
                    placeholder="Ex.: 10.1145/3290605.3300233 ou https://doi.org/…"
                    aria-label="DOI do artigo"
                    [value]="doi()"
                    (input)="doi.set(valor($event))"
                  />
                </div>
                <button
                  type="submit"
                  class="btn btn--primary"
                  [disabled]="!doi().trim() || consultando()"
                >
                  {{ consultando() ? 'Consultando…' : 'Consultar' }}
                </button>
              </form>
              <p class="field__hint">
                O DOI costuma aparecer na primeira página do artigo ou no site
                da revista. Fonte: Crossref.
              </p>

              @if (erroDoi()) {
                <p class="erro" role="alert">{{ erroDoi() }}</p>
              }

              @if (previa(); as p) {
                <div class="previa">
                  <p class="eyebrow">Pré-visualização (ABNT)</p>
                  <p class="previa__abnt" [innerHTML]="p.abntHtml"></p>
                  @if (projetoAlvoId()) {
                    <ng-container
                      *ngTemplateOutlet="botaoAdicionar; context: { $implicit: p.doi }"
                    />
                  }
                </div>
              }
            }

            @if (mensagem()) {
              <p class="confirmacao" aria-live="polite">{{ mensagem() }}</p>
            }
          </div>
        </section>

        @if (projetoAlvoId()) {
          <app-lista-referencias
            [referencias]="referencias()"
            [nomeProjeto]="projetoAlvo()?.nome ?? ''"
            [editavel]="true"
            [carregando]="carregandoLista()"
            [erro]="erroLista()"
            [aviso]="avisoLista()"
            [removendoId]="removendoId()"
            [copiado]="copiado()"
            (copiar)="copiar($event)"
            (copiarTodas)="copiarTodas()"
            (remover)="remover($event)"
          />
        }
      }
    </div>

    <ng-template #botaoAdicionar let-doi>
      @if (!doi) {
        <span class="text-xs muted">Sem DOI</span>
      } @else if (jaNaLista(doi)) {
        <span class="na-lista">
          <app-icone nome="check" class="btn__icon" />
          Na lista
        </span>
      } @else {
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="adicionando() === doi"
          (click)="adicionar(doi)"
        >
          <app-icone nome="mais" class="btn__icon" />
          {{ adicionando() === doi ? 'Adicionando…' : 'Adicionar' }}
        </button>
      }
    </ng-template>
  `,
  styles: `
    .seletor {
      max-width: 28rem;
    }

    .modos {
      max-width: 24rem;
    }

    .busca {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .busca__campo {
      flex: 1 1 16rem;
    }

    .resultados {
      display: grid;
      margin: 0;
      padding: 0;
      list-style: none;
      border: 1px solid var(--border);
    }

    .artigo {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem 1.5rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border);
    }

    .artigo:first-child {
      border-top: 0;
    }

    .artigo__texto {
      display: grid;
      gap: 0.25rem;
      flex: 1 1 20rem;
      min-width: 0;
    }

    .artigo__titulo {
      font-size: 1rem;
      color: var(--primary);
      overflow-wrap: anywhere;
    }

    .artigo__acoes {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .carregar-mais {
      justify-self: center;
    }

    .previa {
      display: grid;
      gap: 0.75rem;
      justify-items: start;
      padding: 1.25rem;
      background: color-mix(in oklch, var(--primary) 4%, var(--card));
      border: 1px solid color-mix(in oklch, var(--primary) 15%, transparent);
    }

    .previa__abnt {
      font-size: 0.9375rem;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .na-lista {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--success);
    }

    .vazio,
    .aviso {
      padding: 1.5rem 1.25rem;
      text-align: center;
      color: var(--muted-foreground);
      font-size: 0.875rem;
    }

    .aviso {
      background: var(--card);
      border: 1px dashed color-mix(in oklch, var(--primary) 20%, transparent);
    }

    .erro {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--destructive);
    }

    .confirmacao {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--success);
    }
  `,
})
export class ReferenciasComponent {
  private readonly auth = inject(AuthService);
  private readonly projetoService = inject(ProjetoService);
  private readonly referenciaService = inject(ReferenciaService);

  readonly visaoProfessor = computed(() =>
    ehEquipeAcademica(this.auth.perfil()),
  );

  /* ---------------------------- projeto alvo ---------------------------- */

  /** Aluno: o grupo dele, pelo RGM. */
  private readonly projetoDoAluno = toSignal(
    toObservable(computed(() => rgmDoUsuario(this.auth.usuario()))).pipe(
      switchMap((rgm) =>
        rgm && !this.visaoProfessor()
          ? this.projetoService.doAluno(rgm).pipe(catchError(() => of(null)))
          : of(null),
      ),
    ),
    { initialValue: null as Projeto | null },
  );

  /** Equipe acadêmica: todos os PFCs, pra escolher no seletor. */
  readonly projetos = toSignal(
    toObservable(this.visaoProfessor).pipe(
      switchMap((professor) =>
        professor
          ? this.projetoService.listar().pipe(catchError(() => of([] as Projeto[])))
          : of([] as Projeto[]),
      ),
    ),
    { initialValue: [] as Projeto[] },
  );

  private readonly projetoEscolhido = signal('');

  readonly projetoAlvo = computed<Projeto | null>(() => {
    if (!this.visaoProfessor()) {
      return this.projetoDoAluno();
    }
    const lista = this.projetos();
    return lista.find((p) => p.id === this.projetoEscolhido()) ?? lista[0] ?? null;
  });

  readonly projetoAlvoId = computed(() => this.projetoAlvo()?.id ?? '');

  /* ------------------------ lista de referências ------------------------ */

  /** Incrementado depois de adicionar/remover pra recarregar a lista. */
  private readonly versaoLista = signal(0);
  readonly carregandoLista = signal(false);
  /** Falha ao carregar — substitui a lista. */
  readonly erroLista = signal('');
  /** Falha numa ação (remover, copiar) — aparece sem esconder a lista. */
  readonly avisoLista = signal('');

  readonly referencias = toSignal(
    toObservable(
      computed(() => ({ id: this.projetoAlvoId(), versao: this.versaoLista() })),
    ).pipe(
      tap(() => this.erroLista.set('')),
      switchMap(({ id }) => {
        if (!id) {
          return of([] as Referencia[]);
        }
        this.carregandoLista.set(true);
        return this.referenciaService.listarDoProjeto(id).pipe(
          tap(() => this.carregandoLista.set(false)),
          catchError((e: Error) => {
            this.carregandoLista.set(false);
            this.erroLista.set(e.message);
            return of([] as Referencia[]);
          }),
        );
      }),
    ),
    { initialValue: [] as Referencia[] },
  );

  private readonly doisNaLista = computed(
    () => new Set(this.referencias().map((r) => r.doi.toLowerCase())),
  );

  /* ------------------------------- busca -------------------------------- */

  readonly modo = signal<ModoBusca>('tema');

  readonly termo = signal('');
  private termoBuscado = '';
  readonly artigos = signal<ArtigoEncontrado[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(1);
  readonly buscando = signal(false);
  readonly buscou = signal(false);
  readonly erroBusca = signal('');

  readonly doi = signal('');
  readonly previa = signal<ReferenciaFormatada | null>(null);
  readonly consultando = signal(false);
  readonly erroDoi = signal('');

  /* ------------------------------- ações -------------------------------- */

  readonly adicionando = signal<string | null>(null);
  readonly removendoId = signal<string | null>(null);
  readonly mensagem = signal('');
  readonly copiado = signal<string | null>(null);
  private temporizadorCopia?: ReturnType<typeof setTimeout>;

  readonly autoria = autoriaCurta;

  constructor() {
    // Trocar de aba limpa o aviso da ação anterior.
    effect(() => {
      this.modo();
      this.mensagem.set('');
    });
  }

  valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  numero(n: number): string {
    return n.toLocaleString('pt-BR');
  }

  detalhes(a: ArtigoEncontrado): string {
    const partes = [
      a.veiculo,
      a.ano?.toString(),
      `${this.numero(a.citacoes)} ${a.citacoes === 1 ? 'citação' : 'citações'}`,
    ];
    return partes.filter(Boolean).join(' · ');
  }

  jaNaLista(doi: string): boolean {
    return this.doisNaLista().has(doi.toLowerCase());
  }

  aoTrocarProjeto(evento: Event): void {
    this.projetoEscolhido.set((evento.target as HTMLSelectElement).value);
  }

  buscar(evento: Event): void {
    evento.preventDefault();
    const termo = this.termo().trim();
    if (termo.length < 3) {
      return;
    }
    this.termoBuscado = termo;
    this.artigos.set([]);
    this.carregarPagina(1);
  }

  carregarMais(): void {
    this.carregarPagina(this.pagina() + 1);
  }

  private carregarPagina(pagina: number): void {
    this.buscando.set(true);
    this.erroBusca.set('');
    this.mensagem.set('');
    this.pagina.set(pagina);

    this.referenciaService.buscar(this.termoBuscado, pagina).subscribe({
      next: (resultado) => {
        this.buscando.set(false);
        this.buscou.set(true);
        this.total.set(resultado.total);
        this.artigos.update((atuais) => [...atuais, ...resultado.artigos]);
      },
      error: (e: Error) => {
        this.buscando.set(false);
        this.buscou.set(true);
        this.erroBusca.set(e.message);
      },
    });
  }

  consultarDoi(evento: Event): void {
    evento.preventDefault();
    const doi = this.doi().trim();
    if (!doi) {
      return;
    }

    this.consultando.set(true);
    this.erroDoi.set('');
    this.previa.set(null);
    this.mensagem.set('');

    this.referenciaService.porDoi(doi).subscribe({
      next: (referencia) => {
        this.consultando.set(false);
        this.previa.set(referencia);
      },
      error: (e: Error) => {
        this.consultando.set(false);
        this.erroDoi.set(e.message);
      },
    });
  }

  adicionar(doi: string): void {
    const projetoId = this.projetoAlvoId();
    if (!projetoId) {
      return;
    }

    this.adicionando.set(doi);
    this.mensagem.set('');

    this.referenciaService.adicionar(projetoId, doi).subscribe({
      next: () => {
        this.adicionando.set(null);
        this.mensagem.set('Referência adicionada à lista do projeto.');
        this.versaoLista.update((v) => v + 1);
      },
      error: (e: Error) => {
        this.adicionando.set(null);
        if (this.modo() === 'doi') {
          this.erroDoi.set(e.message);
        } else {
          this.erroBusca.set(e.message);
        }
      },
    });
  }

  remover(referencia: Referencia): void {
    this.removendoId.set(referencia.id);
    this.avisoLista.set('');

    this.referenciaService
      .remover(referencia.projetoId, referencia.id)
      .subscribe({
        next: () => {
          this.removendoId.set(null);
          this.versaoLista.update((v) => v + 1);
        },
        error: (e: Error) => {
          this.removendoId.set(null);
          this.avisoLista.set(e.message);
        },
      });
  }

  copiar(referencia: Referencia): void {
    void this.copiarParaAreaDeTransferencia(
      referencia.abnt,
      referencia.abntHtml,
      referencia.id,
    );
  }

  copiarTodas(): void {
    const lista = this.referencias();
    void this.copiarParaAreaDeTransferencia(
      lista.map((r) => r.abnt).join('\n\n'),
      lista.map((r) => `<p>${r.abntHtml}</p>`).join(''),
      'todas',
    );
  }

  /**
   * Copia em texto e em HTML: colando no Word/Google Docs, o destaque em
   * negrito exigido pela ABNT vem junto.
   */
  private async copiarParaAreaDeTransferencia(
    texto: string,
    html: string,
    marcador: string,
  ): Promise<void> {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([texto], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(texto);
      }
    } catch {
      this.avisoLista.set(
        'Não foi possível copiar. Selecione o texto e copie manualmente.',
      );
      return;
    }

    this.avisoLista.set('');
    this.copiado.set(marcador);
    clearTimeout(this.temporizadorCopia);
    this.temporizadorCopia = setTimeout(() => this.copiado.set(null), 2000);
  }
}
