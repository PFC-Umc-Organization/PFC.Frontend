import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  Material,
  ROTULO_TIPO_MATERIAL,
  TipoMaterial,
  rotuloCurso,
} from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CursoService } from '../../core/services/curso.service';
import { MaterialService } from '../../core/services/material.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { PrazoPipe } from '../../shared/pipes/prazo.pipe';

/**
 * Materiais de apoio.
 *
 * Esta tela NÃO existe no protótipo do Lovable — foi acrescentada porque
 * "consultar os materiais de apoio" faz parte do escopo do TCC. O visual
 * segue o mesmo sistema das outras telas.
 */
@Component({
  selector: 'app-materiais',
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent, PrazoPipe],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Apoio ao PFC</p>
        <h1 class="page-title mt-2">Materiais de Apoio</h1>
        <p class="lead mt-2">
          Modelos, guias e gravações publicados pela coordenação. Materiais sem
          curso valem para todos.
        </p>
      </header>

      @if (podePublicar()) {
        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Publicar material</h2>

            <form
              class="form-grid form-grid--2 mt-6"
              [formGroup]="form"
              (ngSubmit)="publicar()"
            >
              <div class="field">
                <label class="field__label" for="titulo">Título</label>
                <input
                  id="titulo"
                  type="text"
                  class="control"
                  placeholder="Ex.: Modelo oficial de PFC"
                  formControlName="titulo"
                />
              </div>

              <div class="field">
                <label class="field__label" for="tipo">Tipo</label>
                <select id="tipo" class="control" formControlName="tipo">
                  @for (t of tipos; track t) {
                    <option [value]="t">{{ rotuloTipo(t) }}</option>
                  }
                </select>
              </div>

              <div class="field">
                <label class="field__label" for="url">Link</label>
                <input
                  id="url"
                  type="url"
                  class="control"
                  placeholder="https://…"
                  formControlName="url"
                />
              </div>

              <div class="field">
                <label class="field__label" for="curso">Curso</label>
                <select id="curso" class="control" formControlName="cursoId">
                  <option value="">Todos os cursos</option>
                  @for (c of cursos(); track c.id) {
                    <option [value]="c.id">{{ rotulo(c) }}</option>
                  }
                </select>
              </div>

              <div class="field form-grid__full">
                <label class="field__label" for="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  class="control control--textarea"
                  placeholder="Para que serve e como usar."
                  formControlName="descricao"
                ></textarea>
              </div>

              <div class="form-grid__full">
                <button type="submit" class="btn btn--primary">
                  <app-icone nome="mais" class="btn__icon" />
                  Publicar material
                </button>
              </div>
            </form>
          </div>
        </section>
      }

      <div class="grade">
        @for (m of materiais(); track m.id) {
          <article class="material">
            <div class="material__topo">
              <span class="badge badge--primary">{{ rotuloTipo(m.tipo) }}</span>
              @if (podePublicar()) {
                <button
                  type="button"
                  class="material__remover"
                  (click)="remover(m.id)"
                  [attr.aria-label]="'Remover ' + m.titulo"
                >
                  <app-icone nome="lixeira" />
                </button>
              }
            </div>

            <h3 class="material__titulo">{{ m.titulo }}</h3>
            <p class="material__desc">{{ m.descricao }}</p>

            <footer class="material__base">
              <span class="text-xs muted">
                Publicado em {{ m.publicadoEm | prazo: true }}
              </span>
              <a
                class="material__link"
                [href]="m.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir
                <app-icone nome="link-externo" />
              </a>
            </footer>
          </article>
        } @empty {
          <p class="vazio">Nenhum material publicado ainda.</p>
        }
      </div>
    </div>
  `,
  styles: `
    .grade {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    }

    .material {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.25rem;
      background: var(--card);
      border: 1px solid color-mix(in oklch, var(--primary) 15%, transparent);
    }

    .material__topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .material__remover {
      display: inline-flex;
      padding: 0.25rem;
      color: var(--muted-foreground);
    }

    .material__remover:hover {
      color: var(--destructive);
    }

    .material__titulo {
      font-size: 1.0625rem;
      color: var(--primary);
    }

    .material__desc {
      flex: 1;
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    .material__base {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }

    .material__link {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary);
      text-decoration: none;
    }

    .material__link:hover {
      text-decoration: underline;
    }

    .vazio {
      padding: 2.5rem 1.25rem;
      text-align: center;
      color: var(--muted-foreground);
      background: var(--card);
      border: 1px dashed color-mix(in oklch, var(--primary) 20%, transparent);
    }
  `,
})
export class MateriaisComponent {
  private readonly fb = inject(FormBuilder);
  private readonly materialService = inject(MaterialService);
  private readonly cursoService = inject(CursoService);
  private readonly auth = inject(AuthService);

  readonly tipos: TipoMaterial[] = ['MODELO', 'DOCUMENTO', 'VIDEO', 'LINK'];

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });
  readonly materiais = toSignal(this.materialService.listar(), {
    initialValue: [] as Material[],
  });

  readonly podePublicar = computed(() => this.auth.ehProfessor());
  readonly salvando = signal(false);

  readonly form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    descricao: [''],
    tipo: ['MODELO' as TipoMaterial, [Validators.required]],
    url: ['', [Validators.required]],
    cursoId: [''],
  });

  rotulo = rotuloCurso;

  rotuloTipo(tipo: TipoMaterial): string {
    return ROTULO_TIPO_MATERIAL[tipo];
  }

  publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { titulo, descricao, tipo, url, cursoId } = this.form.getRawValue();
    this.salvando.set(true);

    this.materialService
      .criar({
        titulo,
        descricao,
        tipo,
        url,
        cursoId: cursoId === '' ? null : cursoId,
      })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.form.reset({ tipo: 'MODELO', cursoId: '' });
        },
        error: () => this.salvando.set(false),
      });
  }

  remover(materialId: string): void {
    this.materialService.remover(materialId).subscribe();
  }
}
