import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  ROTULO_STATUS_ATIVIDADE,
  StatusAtividade,
} from '../../core/models';
import { AtividadeService } from '../../core/services/atividade.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { PrazoPipe } from '../../shared/pipes/prazo.pipe';

const TOM_STATUS: Record<StatusAtividade, string> = {
  CONCLUIDA: 'success',
  EM_ANDAMENTO: 'primary',
  ATRASADA: 'destructive',
};

@Component({
  selector: 'app-gestao-pfc',
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent, PrazoPipe],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Planejamento acadêmico</p>
        <h1 class="page-title mt-2">Gestão de PFC</h1>
        <p class="lead mt-2">
          Cadastre as etapas do cronograma com seus prazos. Cada atividade
          publicada vale para todos os projetos e gera um quadrado na timeline
          de cada grupo.
        </p>
      </header>

      <!-- ------------------------- nova atividade ------------------------- -->
      <section class="card">
        <div class="card__body">
          <h2 class="section-title">Nova atividade</h2>
          <p class="lead text-sm mt-1">
            Informe os dados da próxima entrega.
          </p>

          @if (sucesso()) {
            <p class="ok" role="status">
              <app-icone nome="check" />
              Atividade publicada. Ela já aparece na timeline de todos os
              projetos.
            </p>
          }

          <form
            class="form-grid form-grid--2 mt-6"
            [formGroup]="form"
            (ngSubmit)="publicar()"
          >
            <div class="field">
              <label class="field__label" for="titulo">
                Título da atividade
              </label>
              <input
                id="titulo"
                type="text"
                class="control"
                placeholder="Ex.: Revisão Bibliográfica"
                formControlName="titulo"
                [class.control--invalid]="invalido('titulo')"
              />
              @if (invalido('titulo')) {
                <span class="field__error">Informe o título.</span>
              }
            </div>

            <div class="field">
              <label class="field__label" for="prazo">Data e hora limite</label>
              <input
                id="prazo"
                type="datetime-local"
                class="control"
                formControlName="prazo"
                [class.control--invalid]="invalido('prazo')"
              />
              @if (invalido('prazo')) {
                <span class="field__error">Defina o prazo de entrega.</span>
              }
            </div>

            <div class="field form-grid__full">
              <label class="field__label" for="descricao">
                Descrição / Instruções
              </label>
              <textarea
                id="descricao"
                class="control control--textarea"
                placeholder="O que o aluno precisa entregar, formato do arquivo, critérios de avaliação…"
                formControlName="descricao"
              ></textarea>
            </div>

            <div class="form-grid__full">
              <button
                type="submit"
                class="btn btn--primary"
                [disabled]="salvando()"
              >
                <app-icone nome="mais" class="btn__icon" />
                {{ salvando() ? 'Publicando…' : 'Publicar atividade' }}
              </button>
            </div>
          </form>
        </div>
      </section>

      <!-- -------------------- cronograma de entregáveis -------------------- -->
      <section class="card card--flush">
        <div class="card__head">
          <app-icone nome="prancheta" class="card__head-icone" />
          <h2 class="section-title">Cronograma de entregáveis</h2>
        </div>

        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">Atividade</th>
                <th scope="col">Data e hora limite</th>
                <th scope="col">Projetos que entregaram</th>
                <th scope="col">Status</th>
                <th scope="col"><span class="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (r of resumos(); track r.atividade.id) {
                <tr>
                  <td class="cell-strong">{{ r.atividade.titulo }}</td>
                  <td>{{ r.atividade.prazo | prazo }}</td>
                  <td>{{ r.projetosEntregues }}/{{ r.totalProjetos }}</td>
                  <td>
                    <span class="badge" [class]="'badge--' + tom(r.status)">
                      {{ rotuloStatus(r.status) }}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="acao-remover"
                      (click)="remover(r.atividade.id)"
                      [attr.aria-label]="
                        'Remover atividade ' + r.atividade.titulo
                      "
                    >
                      <app-icone nome="lixeira" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td class="table-empty" colspan="5">
                    Nenhuma atividade cadastrada ainda.
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
  private readonly atividades = inject(AtividadeService);

  readonly resumos = toSignal(this.atividades.listarResumos(), {
    initialValue: [],
  });

  readonly salvando = signal(false);
  readonly sucesso = signal(false);

  readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    prazo: ['', [Validators.required]],
    descricao: [''],
  });

  invalido(campo: 'titulo' | 'prazo'): boolean {
    const c = this.form.controls[campo];
    return c.invalid && c.touched;
  }

  tom(status: StatusAtividade): string {
    return TOM_STATUS[status];
  }

  rotuloStatus(status: StatusAtividade): string {
    return ROTULO_STATUS_ATIVIDADE[status];
  }

  publicar(): void {
    this.sucesso.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);

    this.atividades.criar(this.form.getRawValue()).subscribe({
      next: () => {
        this.salvando.set(false);
        this.sucesso.set(true);
        this.form.reset();
      },
      error: () => this.salvando.set(false),
    });
  }

  remover(atividadeId: string): void {
    this.atividades.remover(atividadeId).subscribe();
  }
}
