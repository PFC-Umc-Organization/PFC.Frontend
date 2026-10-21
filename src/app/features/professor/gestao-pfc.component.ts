import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Subject,
  catchError,
  combineLatest,
  of,
  startWith,
  switchMap,
} from 'rxjs';

import {
  Atividade,
  CAMPO_ENTREGA_PADRAO,
  NovoCampoEntrega,
  ROTULO_TIPO_CAMPO,
  TipoCampoEntrega,
  Programa,
  Projeto,
  Usuario,
  ehDoPeriodo,
  ehEquipeAcademica,
  periodoAtual,
  rotuloCurso,
  rotuloTurma,
} from '../../core/models';
import { AtividadeService } from '../../core/services/atividade.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmacaoService } from '../../core/services/confirmacao.service';
import { CursoService } from '../../core/services/curso.service';
import { ProgramaService } from '../../core/services/programa.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { IconeComponent } from '../../shared/components/icone.component';
import { PrazoPipe } from '../../shared/pipes/prazo.pipe';

type SecaoGestao = 'programa' | 'pfcs' | 'atividades';

@Component({
  selector: 'app-gestao-pfc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [ReactiveFormsModule, IconeComponent, PrazoPipe],
  template: `
    <div class="page">
      <header>
        <p class="eyebrow">Planejamento acadêmico</p>
        <h1 class="page-title mt-2">Gestão de PFC</h1>
      </header>

      <!-- ------------------------- menu de seções ------------------------- -->
      <div class="segmented segmented--grid secoes" role="group" aria-label="Seção da tela">
        @for (s of secoes; track s.id) {
          <button
            type="button"
            class="segmented__item"
            [attr.aria-pressed]="secao() === s.id"
            (click)="secao.set(s.id)"
          >
            {{ s.rotulo }}
          </button>
        }
      </div>

      <!-- ----------------------- criar programa de PFC ----------------------- -->
      @if (secao() === 'programa') {
        <section class="card card--flush">
          <div class="card__head pfcs__head">
            <div class="row">
              <app-icone nome="templo" class="card__head-icone" />
              <h2 class="section-title">Criar programa de PFC</h2>
            </div>
            <div class="field pfcs__filtro">
              <label class="sr-only" for="turma-pfc">Turma</label>
              <select
                id="turma-pfc"
                class="control"
                [value]="turmaSelecionada()"
                (change)="trocarTurma($event)"
              >
                @for (c of cursos(); track c.id) {
                  <option [value]="c.id" [selected]="c.id === turmaSelecionada()">{{ rotuloTurma(c) }}</option>
                }
              </select>
            </div>
          </div>

          @if (erroPfc()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erroPfc() }}</span>
            </p>
          }

          @if (!programaAtual()) {
            <div class="pfcs__vazio">
              <p class="lead text-sm">
                Esta turma ainda não tem programa de PFC. Enquanto ele não
                for criado, os alunos não conseguem criar o PFC do grupo.
              </p>
              <button
                type="button"
                class="btn btn--primary btn--sm"
                [disabled]="iniciandoPrograma()"
                (click)="iniciarPrograma()"
              >
                <app-icone nome="mais" class="btn__icon" />
                {{ iniciandoPrograma() ? 'Criando…' : 'Criar programa de PFC' }}
              </button>
            </div>
          } @else {
            <div class="pfcs__vazio">
              <p class="ok" role="status">
                <app-icone nome="check" />
                Programa de PFC criado para esta turma. Os alunos já podem
                criar os PFCs dos grupos.
              </p>
            </div>
          }
        </section>

        <section class="card card--flush">
          <div class="card__head">
            <app-icone nome="prancheta" class="card__head-icone" />
            <h2 class="section-title">
              Programas criados ({{ programasCriados().length }})
            </h2>
          </div>

          @if (erroProgramas()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erroProgramas() }}</span>
            </p>
          }

          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Turma</th>
                  <th scope="col">Período</th>
                  <th scope="col">PFCs criados pelos alunos</th>
                  <th scope="col"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (p of programasCriados(); track p.id) {
                  @if (editandoProgramaId() === p.id) {
                    <tr>
                      <td colspan="4">
                        <div class="programa-edicao">
                          <div class="field">
                            <label class="field__label" for="programa-turma">
                              Turma do programa
                            </label>
                            <select
                              id="programa-turma"
                              class="control"
                              [value]="turmaNovaDoPrograma()"
                              (change)="turmaNovaDoPrograma.set($any($event.target).value)"
                            >
                              @for (c of cursos(); track c.id) {
                                <option [value]="c.id">
                                  {{ rotuloCurso(c) }} - {{ c.periodo }}
                                </option>
                              }
                            </select>
                          </div>
                          <div class="row">
                            <button
                              type="button"
                              class="btn btn--primary btn--sm"
                              (click)="salvarEdicaoPrograma(p.id)"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              class="btn btn--outline btn--sm"
                              (click)="editandoProgramaId.set(null)"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  } @else {
                    <tr>
                      <td class="cell-strong">{{ p.turma }}</td>
                      <td>{{ p.periodo }}</td>
                      <td>{{ p.pfcs }}</td>
                      <td>
                        <div class="row">
                          <button
                            type="button"
                            class="acao-remover"
                            [disabled]="p.pfcs > 0"
                            [attr.title]="
                              p.pfcs > 0
                                ? 'Não dá para trocar a turma de um programa que já tem PFCs'
                                : null
                            "
                            (click)="iniciarEdicaoPrograma(p.id, p.cursoId)"
                            [attr.aria-label]="'Editar programa de ' + p.turma"
                          >
                            <app-icone nome="editar" />
                          </button>
                          <button
                            type="button"
                            class="acao-remover"
                            [disabled]="p.pfcs > 0"
                            [attr.title]="
                              p.pfcs > 0
                                ? 'Não dá para excluir um programa que já tem PFCs'
                                : null
                            "
                            (click)="excluirPrograma(p.id, p.turma)"
                            [attr.aria-label]="'Excluir programa de ' + p.turma"
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
                      Nenhum programa de PFC criado ainda.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- ------------------------ PFCs dos alunos ------------------------ -->
      @if (secao() === 'pfcs') {
        <section class="card card--flush">
          <div class="card__head pfcs__head">
            <div class="row">
              <app-icone nome="templo" class="card__head-icone" />
              <h2 class="section-title">PFCs criados pelos alunos</h2>
            </div>
            <div class="field pfcs__filtro">
              <label class="sr-only" for="turma-pfc">Turma</label>
              <select
                id="turma-pfc"
                class="control"
                [value]="turmaSelecionada()"
                (change)="trocarTurma($event)"
              >
                @for (c of cursos(); track c.id) {
                  <option [value]="c.id" [selected]="c.id === turmaSelecionada()">{{ rotuloTurma(c) }}</option>
                }
              </select>
            </div>
          </div>

          @if (erroPfc()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erroPfc() }}</span>
            </p>
          }

          @if (!programaAtual()) {
            <p class="pfcs__aviso">
              Esta turma ainda não tem programa de PFC. Crie o programa em
              "Criar programa de PFC" para os alunos poderem criar os PFCs.
            </p>
          } @else {
            <div class="table-scroll">
              <table class="data-table">
                <thead>
                  <tr>
                    <th scope="col">PFC</th>
                    <th scope="col">Integrantes</th>
                    <th scope="col">Orientador</th>
                    <th scope="col"><span class="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of pfcs(); track p.id) {
                    @if (editandoId() === p.id) {
                      <tr>
                        <td colspan="4">
                          <form
                            class="form-grid form-grid--2 pfc-edicao"
                            [formGroup]="editForm"
                            (ngSubmit)="salvarEdicao(p.id)"
                          >
                            <div class="field">
                              <label class="field__label" for="edit-nome">
                                Nome
                              </label>
                              <input
                                id="edit-nome"
                                type="text"
                                class="control"
                                formControlName="nome"
                                [class.control--invalid]="invalidoEdicao()"
                              />
                              @if (invalidoEdicao()) {
                                <span class="field__error">
                                  Informe o nome do PFC.
                                </span>
                              }
                            </div>
                            <div class="field">
                              <label class="field__label" for="edit-descricao">
                                Descrição
                              </label>
                              <input
                                id="edit-descricao"
                                type="text"
                                class="control"
                                formControlName="descricao"
                              />
                            </div>

                            <div class="field form-grid__full">
                              <label class="field__label">
                                Integrantes (por RGM)
                              </label>

                              @if (erroIntegrante()) {
                                <span class="field__error">
                                  {{ erroIntegrante() }}
                                </span>
                              }

                              <ul class="integrantes-lista">
                                @for (rgm of p.integrantes; track rgm) {
                                  <li class="integrantes-lista__item">
                                    <span>{{ nomePorRgm(rgm) }}</span>
                                    <button
                                      type="button"
                                      class="acao-remover"
                                      (click)="removerIntegrante(p.id, rgm)"
                                      [attr.aria-label]="
                                        'Remover integrante ' + rgm
                                      "
                                    >
                                      <app-icone nome="lixeira" />
                                    </button>
                                  </li>
                                } @empty {
                                  <li class="muted text-sm">
                                    Nenhum integrante ainda.
                                  </li>
                                }
                              </ul>

                              <div class="row mt-2">
                                <input
                                  type="text"
                                  inputmode="numeric"
                                  maxlength="11"
                                  class="control"
                                  placeholder="RGM do aluno (11 dígitos)"
                                  [value]="rgmParaAdicionar()"
                                  (input)="aoDigitarRgm($event)"
                                />
                                <button
                                  type="button"
                                  class="btn btn--outline btn--sm"
                                  (click)="adicionarIntegrante(p.id)"
                                >
                                  <app-icone nome="mais" class="btn__icon" />
                                  Adicionar
                                </button>
                              </div>
                            </div>

                            <div class="form-grid__full row">
                              <button
                                type="submit"
                                class="btn btn--primary btn--sm"
                              >
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
                        <td class="cell-strong">{{ p.nome }}</td>
                        <td>{{ nomesIntegrantes(p) }}</td>
                        <td>
                          @if (souAdmin()) {
                            @if (editandoOrientadorId() === p.id) {
                              <div class="row">
                                <select
                                  class="control pfcs__orientador"
                                  [value]="p.orientadorId ?? ''"
                                  (change)="definirOrientador(p.id, $event)"
                                >
                                  <option value="">Sem orientador</option>
                                  @for (prof of professores(); track prof.id) {
                                    <option [value]="prof.id">
                                      {{ prof.nome }}
                                    </option>
                                  }
                                </select>
                                <button
                                  type="button"
                                  class="btn btn--outline btn--sm"
                                  (click)="editandoOrientadorId.set(null)"
                                >
                                  Cancelar
                                </button>
                              </div>
                            } @else {
                              <div class="row">
                                <span>
                                  {{
                                    p.orientadorId
                                      ? nomeUsuario(p.orientadorId)
                                      : 'Sem orientador'
                                  }}
                                </span>
                                <button
                                  type="button"
                                  class="acao-remover"
                                  (click)="editandoOrientadorId.set(p.id)"
                                  [attr.aria-label]="
                                    (p.orientadorId ? 'Editar' : 'Adicionar') +
                                    ' orientador de ' +
                                    p.nome
                                  "
                                >
                                  <app-icone
                                    [nome]="p.orientadorId ? 'editar' : 'mais'"
                                  />
                                </button>
                                @if (p.orientadorId) {
                                  <button
                                    type="button"
                                    class="acao-remover"
                                    (click)="removerOrientador(p.id)"
                                    [attr.aria-label]="
                                      'Remover orientador de ' + p.nome
                                    "
                                  >
                                    <app-icone nome="lixeira" />
                                  </button>
                                }
                              </div>
                            }
                          } @else {
                            {{
                              p.orientadorId
                                ? nomeUsuario(p.orientadorId)
                                : 'Sem orientador'
                            }}
                          }
                        </td>
                        <td>
                          <div class="row">
                            <button
                              type="button"
                              class="acao-remover"
                              (click)="iniciarEdicao(p)"
                              [attr.aria-label]="'Editar PFC ' + p.nome"
                            >
                              <app-icone nome="editar" />
                            </button>
                            <button
                              type="button"
                              class="acao-remover"
                              (click)="excluirPfc(p.id, p.nome)"
                              [attr.aria-label]="'Excluir PFC ' + p.nome"
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
                        Nenhum PFC criado pelos alunos desta turma ainda.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }

      @if (secao() === 'atividades') {
        <!-- ------------------------- nova atividade ------------------------- -->
        <section class="card">
          <div class="card__body">
            <h2 class="section-title">Nova atividade</h2>
            <p class="lead text-sm mt-1">
              Informe os dados da próxima entrega.
            </p>

            @if (sucessoAtividade()) {
              <p class="ok" role="status">
                <app-icone nome="check" />
                Atividade publicada. Ela já aparece na timeline de todos os
                projetos.
              </p>
            }

            @if (erroNovaAtividade()) {
              <p class="alerta" role="alert">
                <app-icone nome="alerta" />
                <span>{{ erroNovaAtividade() }}</span>
              </p>
            }

            <form
              class="form-grid form-grid--2 mt-6"
              [formGroup]="novaAtividadeForm"
              (ngSubmit)="publicarAtividade()"
            >
              <div class="field">
                <label class="field__label" for="atividade-titulo">
                  Título da atividade
                </label>
                <input
                  id="atividade-titulo"
                  type="text"
                  class="control"
                  placeholder="Ex.: Revisão Bibliográfica"
                  formControlName="titulo"
                  [class.control--invalid]="invalidoAtividade('titulo')"
                />
                @if (invalidoAtividade('titulo')) {
                  <span class="field__error">Informe o título.</span>
                }
              </div>

              <div class="field">
                <label class="field__label" for="atividade-prazo">
                  Data e hora limite
                </label>
                <input
                  id="atividade-prazo"
                  type="datetime-local"
                  class="control"
                  formControlName="prazo"
                  [class.control--invalid]="invalidoAtividade('prazo')"
                />
                @if (invalidoAtividade('prazo')) {
                  <span class="field__error">Defina o prazo de entrega.</span>
                }
              </div>

              <div class="field form-grid__full">
                <label class="field__label" for="atividade-descricao">
                  Descrição / Instruções
                </label>
                <textarea
                  id="atividade-descricao"
                  class="control control--textarea"
                  placeholder="O que o aluno precisa entregar, formato do arquivo, critérios de avaliação…"
                  formControlName="descricao"
                ></textarea>
              </div>

              <div class="form-grid__full campos">
                <p class="field__label">Campos de entrega</p>
                <p class="campos__aviso">
                  O que o grupo precisa preencher ao entregar. Pelo menos um campo.
                </p>
                <ul class="campos__lista">
                  @for (c of camposNovaAtividade(); track $index) {
                    <li class="campos__item">
                      <span class="cell-strong">{{ c.rotulo }}</span>
                      <span class="campos__meta">
                        {{ rotuloTipoCampo(c.tipo) }}
                        · {{ c.obrigatorio ? 'obrigatório' : 'opcional' }}
                      </span>
                      <button
                        type="button"
                        class="acao-remover"
                        [disabled]="camposNovaAtividade().length <= 1"
                        (click)="removerCampoNovaAtividade($index)"
                        [attr.aria-label]="'Remover campo ' + c.rotulo"
                      >
                        <app-icone nome="lixeira" />
                      </button>
                    </li>
                  }
                </ul>
                <div class="campos__novo">
                  <input
                    class="control"
                    type="text"
                    placeholder="Nome do campo (ex: Link do repositório)"
                    aria-label="Nome do novo campo"
                    [value]="rascunhoRotulo()"
                    (input)="rascunhoRotulo.set($any($event.target).value)"
                    (keydown.enter)="
                      $event.preventDefault(); adicionarCampoNovaAtividade()
                    "
                  />
                  <select
                    class="control"
                    aria-label="Tipo do novo campo"
                    [value]="rascunhoTipo()"
                    (change)="rascunhoTipo.set($any($event.target).value)"
                  >
                    @for (t of tiposCampo; track t) {
                      <option [value]="t">{{ rotuloTipoCampo(t) }}</option>
                    }
                  </select>
                  <label class="campos__check">
                    <input
                      type="checkbox"
                      [checked]="rascunhoObrigatorio()"
                      (change)="rascunhoObrigatorio.set($any($event.target).checked)"
                    />
                    Obrigatório
                  </label>
                  <button
                    type="button"
                    class="btn btn--outline btn--sm"
                    [disabled]="!rascunhoRotulo().trim()"
                    (click)="adicionarCampoNovaAtividade()"
                  >
                    <app-icone nome="mais" class="btn__icon" />
                    Adicionar campo
                  </button>
                </div>
              </div>

              <div class="form-grid__full">
                <button
                  type="submit"
                  class="btn btn--primary"
                  [disabled]="salvandoAtividade()"
                >
                  <app-icone nome="mais" class="btn__icon" />
                  {{ salvandoAtividade() ? 'Publicando…' : 'Publicar atividade' }}
                </button>
              </div>
            </form>
          </div>
        </section>

        <!-- -------------------- cronograma de atividades -------------------- -->
        <section class="card card--flush">
          <div class="card__head">
            <app-icone nome="prancheta" class="card__head-icone" />
            <h2 class="section-title">Cronograma de atividades</h2>
          </div>

          @if (erroAtividades()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>Não foi possível carregar as atividades: {{ erroAtividades() }}</span>
            </p>
          }
          @if (erroRemocaoAtividade()) {
            <p class="alerta" role="alert">
              <app-icone nome="alerta" />
              <span>{{ erroRemocaoAtividade() }}</span>
            </p>
          }

          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Atividade</th>
                  <th scope="col">Data e hora limite</th>
                  <th scope="col"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (a of atividades(); track a.id) {
                  @if (editandoAtividadeId() === a.id) {
                    <tr>
                      <td colspan="3">
                        @if (erroEdicaoAtividade()) {
                          <p class="alerta" role="alert">
                            <app-icone nome="alerta" />
                            <span>{{ erroEdicaoAtividade() }}</span>
                          </p>
                        }

                        <form
                          class="form-grid form-grid--2 atividade-edicao"
                          [formGroup]="editAtividadeForm"
                          (ngSubmit)="salvarEdicaoAtividade(a.id)"
                        >
                          <div class="field">
                            <label class="field__label" for="edit-atividade-titulo">
                              Título da atividade
                            </label>
                            <input
                              id="edit-atividade-titulo"
                              type="text"
                              class="control"
                              formControlName="titulo"
                              [class.control--invalid]="invalidoEdicaoAtividade('titulo')"
                            />
                            @if (invalidoEdicaoAtividade('titulo')) {
                              <span class="field__error">
                                Informe o título.
                              </span>
                            }
                          </div>

                          <div class="field">
                            <label class="field__label" for="edit-atividade-prazo">
                              Data e hora limite
                            </label>
                            <input
                              id="edit-atividade-prazo"
                              type="datetime-local"
                              class="control"
                              formControlName="prazo"
                              [class.control--invalid]="invalidoEdicaoAtividade('prazo')"
                            />
                            @if (invalidoEdicaoAtividade('prazo')) {
                              <span class="field__error">
                                Defina o prazo de entrega.
                              </span>
                            }
                          </div>

                          <div class="field form-grid__full">
                            <label class="field__label" for="edit-atividade-descricao">
                              Descrição / Instruções
                            </label>
                            <textarea
                              id="edit-atividade-descricao"
                              class="control control--textarea"
                              formControlName="descricao"
                            ></textarea>
                          </div>

                          <div class="form-grid__full campos">
                            <p class="field__label">Campos de entrega</p>
                            <ul class="campos__lista">
                              @for (c of a.campos; track c.id) {
                                <li class="campos__item">
                                  <span class="cell-strong">{{ c.rotulo }}</span>
                                  <span class="campos__meta">
                                    {{ rotuloTipoCampo(c.tipo) }}
                                    · {{ c.obrigatorio ? 'obrigatório' : 'opcional' }}
                                  </span>
                                  <button
                                    type="button"
                                    class="acao-remover"
                                    [disabled]="a.campos.length <= 1"
                                    (click)="removerCampo(a.id, c.id)"
                                    [attr.aria-label]="'Remover campo ' + c.rotulo"
                                  >
                                    <app-icone nome="lixeira" />
                                  </button>
                                </li>
                              }
                            </ul>
                            @if (a.campos.length <= 1) {
                              <p class="campos__aviso">
                                A atividade precisa de ao menos um campo de entrega.
                              </p>
                            }
                            @if (erroCampo()) {
                              <p class="campos__aviso campos__aviso--erro">
                                {{ erroCampo() }}
                              </p>
                            }
                            <div class="campos__novo">
                              <input
                                class="control"
                                type="text"
                                placeholder="Nome do campo (ex: Link do repositório)"
                                aria-label="Nome do novo campo"
                                [value]="novoCampoRotulo()"
                                (input)="novoCampoRotulo.set($any($event.target).value)"
                                (keydown.enter)="
                                  $event.preventDefault(); adicionarCampo(a.id)
                                "
                              />
                              <select
                                class="control"
                                aria-label="Tipo do novo campo"
                                [value]="novoCampoTipo()"
                                (change)="
                                  novoCampoTipo.set($any($event.target).value)
                                "
                              >
                                @for (t of tiposCampo; track t) {
                                  <option [value]="t">{{ rotuloTipoCampo(t) }}</option>
                                }
                              </select>
                              <label class="campos__check">
                                <input
                                  type="checkbox"
                                  [checked]="novoCampoObrigatorio()"
                                  (change)="
                                    novoCampoObrigatorio.set($any($event.target).checked)
                                  "
                                />
                                Obrigatório
                              </label>
                              <button
                                type="button"
                                class="btn btn--outline btn--sm"
                                (click)="adicionarCampo(a.id)"
                              >
                                <app-icone nome="mais" class="btn__icon" />
                                Adicionar campo
                              </button>
                            </div>
                          </div>

                          <div class="form-grid__full row">
                            <button type="submit" class="btn btn--primary btn--sm">
                              Salvar
                            </button>
                            <button
                              type="button"
                              class="btn btn--outline btn--sm"
                              (click)="cancelarEdicaoAtividade()"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  } @else {
                    <tr>
                      <td class="cell-strong">{{ a.titulo }}</td>
                      <td>{{ a.prazo | prazo }}</td>
                      <td>
                        <div class="row">
                          <button
                            type="button"
                            class="acao-remover"
                            (click)="iniciarEdicaoAtividade(a)"
                            [attr.aria-label]="
                              'Editar atividade ' + a.titulo
                            "
                          >
                            <app-icone nome="editar" />
                          </button>
                          <button
                            type="button"
                            class="acao-remover"
                            (click)="removerAtividade(a.id, a.titulo)"
                            [attr.aria-label]="
                              'Remover atividade ' + a.titulo
                            "
                          >
                            <app-icone nome="lixeira" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                } @empty {
                  <tr>
                    <td class="table-empty" colspan="3">
                      Nenhuma atividade cadastrada ainda.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .pfcs__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .pfcs__filtro {
      min-width: 14rem;
    }

    .pfcs__orientador {
      height: 2.25rem;
      font-size: 0.8125rem;
    }

    .pfcs__vazio {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.25rem;
    }

    .programa-edicao {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.5rem 0;
    }

    .programa-edicao .field {
      flex: 1 1 18rem;
    }

    .pfcs__aviso {
      padding: 1.25rem;
      font-size: 0.875rem;
      color: var(--muted-foreground);
    }

    .secoes {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }

    @media (min-width: 700px) {
      .secoes {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    .pfc-edicao {
      padding: 0.5rem 0;
    }

    .atividade-edicao {
      padding: 0.5rem 0;
    }

    .campos__lista {
      list-style: none;
      margin: 0.5rem 0;
      padding: 0;
      border: 1px solid var(--border);
    }

    .campos__item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    .campos__item:last-child {
      border-bottom: none;
    }

    .campos__meta {
      flex: 1;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .campos__aviso {
      margin: 0 0 0.5rem;
      font-size: 0.75rem;
      color: var(--muted-foreground);
    }

    .campos__aviso--erro {
      color: var(--destructive);
    }

    .campos__novo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    .campos__novo .control {
      width: auto;
      flex: 1 1 12rem;
    }

    .campos__check {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
    }

    .ok {
      margin-top: 1rem;
    }

    .integrantes-lista {
      display: grid;
      gap: 0.375rem;
      margin: 0.5rem 0 0;
      padding: 0;
      list-style: none;
    }

    .integrantes-lista__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.375rem 0.625rem;
      font-size: 0.8125rem;
      background: var(--marble);
      border: 1px solid color-mix(in oklch, var(--primary) 15%, transparent);
    }

    .alerta {
      margin: 1rem 1.25rem 0;
    }
  `,
})
export class GestaoPfcComponent {
  private readonly fb = inject(FormBuilder);
  private readonly atividadeService = inject(AtividadeService);
  private readonly auth = inject(AuthService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly cursoService = inject(CursoService);
  private readonly programaService = inject(ProgramaService);
  private readonly projetoService = inject(ProjetoService);
  private readonly usuarioService = inject(UsuarioService);

  readonly rotuloCurso = rotuloCurso;
  readonly rotuloTurma = rotuloTurma;

  readonly souAdmin = computed(
    () => this.auth.perfil() === 'ADMIN',
  );

  /** A tela mostra uma seção por vez; a escolha vem do menu no topo. */
  readonly secoes: { id: SecaoGestao; rotulo: string }[] = [
    { id: 'programa', rotulo: 'Criar programa de PFC' },
    { id: 'pfcs', rotulo: 'PFCs dos alunos' },
    { id: 'atividades', rotulo: 'Atividades' },
  ];
  readonly secao = signal<SecaoGestao>('programa');

  readonly cursos = toSignal(this.cursoService.listar(), { initialValue: [] });
  private readonly turmaEscolhida = signal<string | null>(null);

  /** A turma escolhida ou, de início, a primeira do semestre atual. */
  readonly turmaSelecionada = computed(() => {
    const cursos = this.cursos();
    const escolhida = this.turmaEscolhida();
    if (escolhida && cursos.some((c) => c.id === escolhida)) {
      return escolhida;
    }
    const atual = periodoAtual();
    return (cursos.find((c) => ehDoPeriodo(c, atual)) ?? cursos[0])?.id ?? '';
  });

  
  private readonly recarregarProgramas$ = new Subject<void>();
  private readonly recarregarPfcs$ = new Subject<void>();

  readonly programas = toSignal(
    this.recarregarProgramas$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.programaService.listar().pipe(
          catchError((e: Error) => {
            this.erroProgramas.set(e.message);
            return of([] as Programa[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as Programa[] },
  );

  readonly programaAtual = computed(
    () =>
      this.programas().find((p) => p.cursoId === this.turmaSelecionada()) ??
      null,
  );

  readonly pfcs = toSignal(
    combineLatest([
      toObservable(computed(() => this.programaAtual()?.id)),
      this.recarregarPfcs$.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([programaId]) =>
        programaId
          ? this.projetoService.listar(programaId).pipe(
              catchError((e: Error) => {
                this.erroPfc.set(e.message);
                return of([] as Projeto[]);
              }),
            )
          : of([]),
      ),
    ),
    { initialValue: [] as Projeto[] },
  );

  /** Todos os PFCs de todos os programas, só para contar por programa. */
  private readonly todosPfcs = toSignal(
    this.recarregarPfcs$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.projetoService.listar().pipe(catchError(() => of([] as Projeto[]))),
      ),
    ),
    { initialValue: [] as Projeto[] },
  );

  /** Cada programa já criado, com a turma dele e quantos PFCs os alunos criaram. */
  readonly programasCriados = computed(() =>
    this.programas()
      .map((p) => {
        const turma = this.cursos().find((c) => c.id === p.cursoId);
        return {
          id: p.id,
          cursoId: p.cursoId,
          turma: turma ? rotuloCurso(turma) : 'Turma removida',
          periodo: turma?.periodo ?? '—',
          pfcs: this.todosPfcs().filter((x) => x.programaId === p.id).length,
        };
      })
      .sort(
        (a, b) =>
          a.turma.localeCompare(b.turma, 'pt-BR') ||
          a.periodo.localeCompare(b.periodo),
      ),
  );

  readonly editandoProgramaId = signal<string | null>(null);
  readonly turmaNovaDoPrograma = signal('');
  readonly erroProgramas = signal('');

  iniciarEdicaoPrograma(programaId: string, cursoId: string): void {
    this.erroProgramas.set('');
    this.turmaNovaDoPrograma.set(cursoId);
    this.editandoProgramaId.set(programaId);
  }

  salvarEdicaoPrograma(programaId: string): void {
    this.erroProgramas.set('');
    this.programaService
      .atualizar(programaId, this.turmaNovaDoPrograma())
      .subscribe({
        next: () => {
          this.editandoProgramaId.set(null);
          this.recarregarProgramas$.next();
        },
        error: (e: Error) => this.erroProgramas.set(e.message),
      });
  }

  async excluirPrograma(programaId: string, turma: string): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Excluir programa de PFC',
      mensagem: `Excluir o programa de PFC de "${turma}"? Os alunos dessa turma deixam de poder criar PFC até o programa ser criado de novo.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }

    this.erroProgramas.set('');
    this.programaService.deletar(programaId).subscribe({
      next: () => this.recarregarProgramas$.next(),
      error: (e: Error) => this.erroProgramas.set(e.message),
    });
  }

  private readonly todosUsuarios = toSignal(
    this.usuarioService.listar().pipe(catchError(() => of([] as Usuario[]))),
    { initialValue: [] as Usuario[] },
  );

  readonly professores = computed(() =>
    this.todosUsuarios().filter((u) => ehEquipeAcademica(u.perfil)),
  );

  readonly erroPfc = signal('');

  readonly iniciandoPrograma = signal(false);

  readonly editandoId = signal<string | null>(null);
  readonly editandoOrientadorId = signal<string | null>(null);

  readonly editForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    descricao: [''],
  });

  readonly rgmParaAdicionar = signal('');
  readonly erroIntegrante = signal('');

  trocarTurma(evento: Event): void {
    this.turmaEscolhida.set((evento.target as HTMLSelectElement).value);
  }

  nomeUsuario(id: string): string {
    return this.todosUsuarios().find((u) => u.id === id)?.nome ?? '—';
  }

  nomePorRgm(rgm: string): string {
    return this.todosUsuarios().find((u) => u.rgm === rgm)?.nome ?? rgm;
  }

  nomesIntegrantes(p: Projeto): string {
    return p.integrantes.map((rgm) => this.nomePorRgm(rgm)).join(', ') || '—';
  }

  iniciarPrograma(): void {
    this.erroPfc.set('');
    this.iniciandoPrograma.set(true);

    this.programaService
      .criar({ cursoId: this.turmaSelecionada() })
      .subscribe({
        next: () => {
          this.iniciandoPrograma.set(false);
          this.recarregarProgramas$.next();
        },
        error: (e: Error) => {
          this.iniciandoPrograma.set(false);
          this.erroPfc.set(e.message);
        },
      });
  }

  iniciarEdicao(p: Projeto): void {
    this.erroPfc.set('');
    this.erroIntegrante.set('');
    this.rgmParaAdicionar.set('');
    this.editandoId.set(p.id);
    this.editForm.setValue({ nome: p.nome, descricao: p.descricao });
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
  }

  invalidoEdicao(): boolean {
    const c = this.editForm.controls.nome;
    return c.invalid && c.touched;
  }

  salvarEdicao(projetoId: string): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.projetoService
      .atualizar(projetoId, this.editForm.getRawValue())
      .subscribe({
        next: () => {
          this.editandoId.set(null);
          this.recarregarPfcs$.next();
        },
        error: (e: Error) => this.erroPfc.set(e.message),
      });
  }

  /** Filtra qualquer caractere que não seja dígito e trava em 11 dígitos. */
  aoDigitarRgm(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const digitos = campo.value.replace(/\D/g, '').slice(0, 11);
    campo.value = digitos;
    this.rgmParaAdicionar.set(digitos);
  }

  adicionarIntegrante(projetoId: string): void {
    const rgm = this.rgmParaAdicionar().trim();
    this.erroIntegrante.set('');

    if (!/^\d{11}$/.test(rgm)) {
      this.erroIntegrante.set('Informe um RGM válido (11 dígitos, só números).');
      return;
    }

    this.projetoService.adicionarIntegrante(projetoId, rgm).subscribe({
      next: () => {
        this.rgmParaAdicionar.set('');
        this.recarregarPfcs$.next();
      },
      error: (e: Error) => this.erroIntegrante.set(e.message),
    });
  }

  removerIntegrante(projetoId: string, rgm: string): void {
    this.erroIntegrante.set('');
    this.projetoService.removerIntegrante(projetoId, rgm).subscribe({
      next: () => this.recarregarPfcs$.next(),
      error: (e: Error) => this.erroIntegrante.set(e.message),
    });
  }

  definirOrientador(projetoId: string, evento: Event): void {
    const orientadorId = (evento.target as HTMLSelectElement).value;
    this.erroPfc.set('');

    const acao = orientadorId
      ? this.projetoService.definirOrientador(projetoId, orientadorId)
      : this.projetoService.removerOrientador(projetoId);

    acao.subscribe({
      next: () => {
        this.editandoOrientadorId.set(null);
        this.recarregarPfcs$.next();
      },
      error: (e: Error) => this.erroPfc.set(e.message),
    });
  }

  removerOrientador(projetoId: string): void {
    this.erroPfc.set('');
    this.projetoService.removerOrientador(projetoId).subscribe({
      next: () => this.recarregarPfcs$.next(),
      error: (e: Error) => this.erroPfc.set(e.message),
    });
  }

  async excluirPfc(projetoId: string, nome: string): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Excluir PFC',
      mensagem: `Excluir o PFC "${nome}"? Essa ação não pode ser desfeita.`,
      textoConfirmar: 'Excluir',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }

    this.erroPfc.set('');
    this.projetoService.remover(projetoId).subscribe({
      next: () => this.recarregarPfcs$.next(),
      error: (e: Error) => this.erroPfc.set(e.message),
    });
  }

  /* ------------------------------ atividades ------------------------------ */

  readonly erroAtividades = signal('');
  readonly atividades = toSignal(
    this.atividadeService.listar().pipe(
      catchError((e: Error) => {
        this.erroAtividades.set(e.message);
        return of([] as Atividade[]);
      }),
    ),
    { initialValue: [] as Atividade[] },
  );

  readonly salvandoAtividade = signal(false);
  readonly sucessoAtividade = signal(false);
  readonly erroNovaAtividade = signal('');
  readonly erroRemocaoAtividade = signal('');

  readonly novaAtividadeForm = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    prazo: ['', [Validators.required]],
    descricao: [''],
  });

  readonly editandoAtividadeId = signal<string | null>(null);
  readonly erroEdicaoAtividade = signal('');

  readonly editAtividadeForm = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    prazo: ['', [Validators.required]],
    descricao: [''],
  });

  invalidoAtividade(campo: 'titulo' | 'prazo'): boolean {
    const c = this.novaAtividadeForm.controls[campo];
    return c.invalid && c.touched;
  }

  invalidoEdicaoAtividade(campo: 'titulo' | 'prazo'): boolean {
    const c = this.editAtividadeForm.controls[campo];
    return c.invalid && c.touched;
  }

  publicarAtividade(): void {
    this.sucessoAtividade.set(false);
    this.erroNovaAtividade.set('');

    if (this.novaAtividadeForm.invalid) {
      this.novaAtividadeForm.markAllAsTouched();
      return;
    }

    this.salvandoAtividade.set(true);

    this.atividadeService
      .criar({
        ...this.novaAtividadeForm.getRawValue(),
        campos: this.camposNovaAtividade(),
      })
      .subscribe({
      next: () => {
        this.salvandoAtividade.set(false);
        this.sucessoAtividade.set(true);
        this.novaAtividadeForm.reset();
        this.camposNovaAtividade.set([{ ...CAMPO_ENTREGA_PADRAO }]);
      },
      error: (e: Error) => {
        this.salvandoAtividade.set(false);
        this.erroNovaAtividade.set(e.message);
      },
    });
  }

  async removerAtividade(atividadeId: string, titulo: string): Promise<void> {
    const confirmado = await this.confirmacao.confirmar({
      titulo: 'Remover atividade',
      mensagem: `Remover a atividade "${titulo}"? Essa ação não pode ser desfeita.`,
      textoConfirmar: 'Remover',
      perigo: true,
    });
    if (!confirmado) {
      return;
    }
    this.erroRemocaoAtividade.set('');
    this.atividadeService.remover(atividadeId).subscribe({
      error: (e: Error) => this.erroRemocaoAtividade.set(e.message),
    });
  }

  iniciarEdicaoAtividade(atividade: Atividade): void {
    this.erroEdicaoAtividade.set('');
    this.erroCampo.set('');
    this.editandoAtividadeId.set(atividade.id);
    this.editAtividadeForm.setValue({
      titulo: atividade.titulo,
      prazo: atividade.prazo.slice(0, 16),
      descricao: atividade.descricao,
    });
  }

  cancelarEdicaoAtividade(): void {
    this.editandoAtividadeId.set(null);
    this.erroCampo.set('');
  }

  /* --------------------------- campos de entrega --------------------------- */

  /** Campos do formulário de entrega da atividade que está sendo criada. */
  readonly camposNovaAtividade = signal<NovoCampoEntrega[]>([
    { ...CAMPO_ENTREGA_PADRAO },
  ]);
  readonly rascunhoRotulo = signal('');
  readonly rascunhoTipo = signal<TipoCampoEntrega>('TEXTO');
  readonly rascunhoObrigatorio = signal(true);

  adicionarCampoNovaAtividade(): void {
    const rotulo = this.rascunhoRotulo().trim();
    if (!rotulo) {
      return;
    }
    this.camposNovaAtividade.update((campos) => [
      ...campos,
      {
        rotulo,
        tipo: this.rascunhoTipo(),
        obrigatorio: this.rascunhoObrigatorio(),
      },
    ]);
    this.rascunhoRotulo.set('');
  }

  removerCampoNovaAtividade(indice: number): void {
    this.camposNovaAtividade.update((campos) =>
      campos.length <= 1 ? campos : campos.filter((_, i) => i !== indice),
    );
  }

  readonly tiposCampo = Object.keys(ROTULO_TIPO_CAMPO) as TipoCampoEntrega[];
  readonly novoCampoRotulo = signal('');
  readonly novoCampoTipo = signal<TipoCampoEntrega>('TEXTO');
  readonly novoCampoObrigatorio = signal(true);
  readonly erroCampo = signal('');

  rotuloTipoCampo(tipo: TipoCampoEntrega): string {
    return ROTULO_TIPO_CAMPO[tipo];
  }

  adicionarCampo(atividadeId: string): void {
    this.erroCampo.set('');
    this.atividadeService
      .adicionarCampo(atividadeId, {
        rotulo: this.novoCampoRotulo(),
        tipo: this.novoCampoTipo(),
        obrigatorio: this.novoCampoObrigatorio(),
      })
      .subscribe({
        next: () => this.novoCampoRotulo.set(''),
        error: (e: Error) => this.erroCampo.set(e.message),
      });
  }

  removerCampo(atividadeId: string, campoId: string): void {
    this.erroCampo.set('');
    this.atividadeService.removerCampo(atividadeId, campoId).subscribe({
      error: (e: Error) => this.erroCampo.set(e.message),
    });
  }

  salvarEdicaoAtividade(atividadeId: string): void {
    if (this.editAtividadeForm.invalid) {
      this.editAtividadeForm.markAllAsTouched();
      return;
    }

    this.atividadeService
      .atualizar(atividadeId, this.editAtividadeForm.getRawValue())
      .subscribe({
        next: () => this.editandoAtividadeId.set(null),
        error: (e: Error) => this.erroEdicaoAtividade.set(e.message),
      });
  }
}
