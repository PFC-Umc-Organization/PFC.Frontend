import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, startWith, switchMap } from 'rxjs';

import { CURSOS_DISPONIVEIS, Curso, NomeCurso, ROTULO_TURNO, Turno } from '../../core/models';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { CursoService } from '../../core/services/curso.service';
import { IconeComponent } from '../../shared/components/icone.component';

/**
 * CRUD de Turmas, restrito a ADMIN. `listar()` do HttpClient é um
 * Observable frio — dispara uma vez e acaba — por isso o `Subject` como
 * gatilho manual de recarga (mesmo padrão de `gestao-pfc.component.ts`).
 */
@Component({
  selector: 'app-turmas',
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Administração</p>
        <h1 class="page-title mt-2">Turmas</h1>
        <p class="lead mt-2">
          Cadastre as turmas em que o PFC é ofertado — curso, turno e
          período.
        </p>
      </header>

      <section class="card">
        <div class="card__body">
          <h2 class="section-title">Nova turma</h2>

          @if (erro()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erro() }}</span>
            </p>
          }

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
                @for (c of cursosDisponiveis; track c) {
                  <option [value]="c">{{ c }}</option>
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
                formControlName="periodo"
                [class.control--invalid]="invalidoNovo('periodo')"
              />
              @if (invalidoNovo('periodo')) {
                <span class="field__error">Informe o período.</span>
              }
            </div>

            <div class="form-grid__full">
              <button
                type="submit"
                class="btn btn--primary"
                [disabled]="criando()"
              >
                <app-icone nome="mais" class="btn__icon" />
                {{ criando() ? 'Criando…' : 'Criar turma' }}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section class="card card--flush">
        <div class="card__head">
          <app-icone nome="calendario" class="card__head-icone" />
          <h2 class="section-title">Turmas cadastradas</h2>
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
              @for (c of turmas(); track c.id) {
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
                            @for (opcao of cursosDisponiveis; track opcao) {
                              <option [value]="opcao">{{ opcao }}</option>
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
                            formControlName="periodo"
                            [class.control--invalid]="invalidoEdicao('periodo')"
                          />
                        </div>
                        <div class="form-grid__full row">
                          <button type="submit" class="btn btn--primary btn--sm">
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
                    <td class="cell-strong">{{ c.nome }}</td>
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
                    Nenhuma turma cadastrada ainda.
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

    .pfc-edicao {
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
export class TurmasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cursoService = inject(CursoService);
  private readonly confirmacao = inject(ConfirmacaoService);

  private readonly recarregar$ = new Subject<void>();

  readonly turmas = toSignal(
    this.recarregar$.pipe(
      startWith(undefined),
      switchMap(() => this.cursoService.listar()),
    ),
    { initialValue: [] as Curso[] },
  );

  readonly erro = signal('');
  readonly criando = signal(false);
  readonly editandoId = signal<string | null>(null);

  readonly cursosDisponiveis = CURSOS_DISPONIVEIS;

  readonly novoForm = this.fb.nonNullable.group({
    nome: ['' as NomeCurso, [Validators.required]],
    turno: ['MANHA' as Turno, [Validators.required]],
    periodo: ['', [Validators.required]],
  });

  readonly editForm = this.fb.nonNullable.group({
    nome: ['' as NomeCurso, [Validators.required]],
    turno: ['MANHA' as Turno, [Validators.required]],
    periodo: ['', [Validators.required]],
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
        this.novoForm.reset({ nome: '' as NomeCurso, turno: 'MANHA', periodo: '' });
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
      nome: curso.nome,
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
      mensagem: `Excluir a turma "${nome}"? Essa ação não pode ser desfeita.`,
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
