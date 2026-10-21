import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { ItemTimeline, Projeto, rgmDoUsuario } from '../../core/models';
import { AtividadeService } from '../../core/services/atividade.service';
import { AuthService } from '../../core/services/auth.service';
import { EntregaService } from '../../core/services/entrega.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { statusDaEntrega } from '../../core/services/status-entrega';
import { IconeComponent } from '../../shared/components/icone.component';
import { TimelineComponent } from '../aluno/timeline.component';

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; projeto: Projeto | null; itens: ItemTimeline[] };

/**
 * Painel do aluno: o cronograma das atividades. Sem PFC, o aluno vê os prazos
 * do mesmo jeito (as atividades valem para todas as turmas) e um aviso de que
 * a entrega é feita pelo grupo.
 */
@Component({
  selector: 'app-painel-aluno',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [TimelineComponent, IconeComponent, RouterLink],
  template: `
    @switch (estado().tipo) {
      @case ('carregando') {
        <p class="carregando" role="status">Carregando as atividades…</p>
      }
      @case ('erro') {
        <p class="alerta" role="alert">
          <app-icone nome="alerta" />
          <span>{{ mensagemErro() }}</span>
        </p>
      }
      @default {
        @if (!projeto()) {
          <p class="aviso" role="status">
            <app-icone nome="alerta" />
            <span>
              Você ainda não faz parte de um PFC. As entregas são feitas pelo grupo:
              <a routerLink="/meu-pfc">crie o PFC ou aceite um convite</a>.
            </span>
          </p>
        }
        <app-timeline
          sobretitulo="Entregáveis"
          titulo="Cronograma de entregas"
          [descricao]="descricao()"
          [itens]="itens()"
          [mostrarLegenda]="itens().length > 0"
          [interativo]="!!projeto()"
        />
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1.5rem;
    }

    .carregando {
      margin: 0;
      color: var(--muted-foreground);
    }

    .aviso {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      margin: 0;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border);
      background: var(--card);
      font-size: 0.875rem;
    }
  `,
})
export class PainelAlunoComponent {
  private readonly auth = inject(AuthService);
  private readonly projetoService = inject(ProjetoService);
  private readonly entregaService = inject(EntregaService);
  private readonly atividadeService = inject(AtividadeService);

  readonly estado = toSignal(
    toObservable(computed(() => rgmDoUsuario(this.auth.usuario()))).pipe(
      switchMap((rgm) => (rgm ? this.projetoService.doAluno(rgm) : of(null))),
      switchMap((projeto) =>
        (projeto
          ? this.entregaService.timelineDoProjeto(projeto.id, projeto.nome)
          : this.atividadeService.listar().pipe(
              map((atividades) =>
                atividades.map<ItemTimeline>((a) => ({
                  atividadeId: a.id,
                  titulo: a.titulo,
                  projetoNome: '',
                  prazo: a.prazo,
                  status: statusDaEntrega(a.prazo, undefined),
                })),
              ),
            )
        ).pipe(map((itens): Estado => ({ tipo: 'pronto', projeto, itens }))),
      ),
      catchError((e: Error) => of<Estado>({ tipo: 'erro', mensagem: e.message })),
      startWith<Estado>({ tipo: 'carregando' }),
    ),
    { initialValue: { tipo: 'carregando' } as Estado },
  );

  readonly projeto = computed(() => {
    const e = this.estado();
    return e.tipo === 'pronto' ? e.projeto : null;
  });

  readonly itens = computed(() => {
    const e = this.estado();
    return e.tipo === 'pronto' ? e.itens : [];
  });

  readonly mensagemErro = computed(() => {
    const e = this.estado();
    return e.tipo === 'erro'
      ? `Não foi possível carregar as atividades: ${e.mensagem}`
      : '';
  });

  readonly descricao = computed(() =>
    this.projeto()
      ? `Prazos e situação das entregas do grupo ${this.projeto()!.nome}.`
      : 'Prazos das atividades do PFC.',
  );
}
