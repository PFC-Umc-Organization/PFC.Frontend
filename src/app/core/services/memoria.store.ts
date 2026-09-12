import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  Atividade,
  Curso,
  Entrega,
  Material,
  Projeto,
  StatusAtividade,
  StatusEntrega,
  Usuario,
  rotuloCurso,
} from '../models';
import {
  ATIVIDADES_SEED,
  CURSOS_SEED,
  ENTREGAS_SEED,
  MATERIAIS_SEED,
  PROJETOS_SEED,
  USUARIOS_SEED,
} from './dados-mock';

/**
 * Fonte de verdade em memória usada pelas implementações mock dos services.
 *
 * Existe um único store para o app inteiro, então marcar uma entrega na
 * timeline do aluno reflete na hora nas tabelas do professor — do mesmo jeito
 * que aconteceria com o backend real.
 */
@Injectable({ providedIn: 'root' })
export class MemoriaStore {
  private readonly cursos$ = new BehaviorSubject<Curso[]>([...CURSOS_SEED]);
  private readonly projetos$ = new BehaviorSubject<Projeto[]>([
    ...PROJETOS_SEED,
  ]);
  private readonly usuarios$ = new BehaviorSubject<Usuario[]>([
    ...USUARIOS_SEED,
  ]);
  private readonly atividades$ = new BehaviorSubject<Atividade[]>([
    ...ATIVIDADES_SEED,
  ]);
  private readonly entregas$ = new BehaviorSubject<Entrega[]>([
    ...ENTREGAS_SEED,
  ]);
  private readonly materiais$ = new BehaviorSubject<Material[]>([
    ...MATERIAIS_SEED,
  ]);

  readonly cursos = this.cursos$.asObservable();
  readonly projetos = this.projetos$.asObservable();
  readonly usuarios = this.usuarios$.asObservable();
  readonly atividades = this.atividades$.asObservable();
  readonly entregas = this.entregas$.asObservable();
  readonly materiais = this.materiais$.asObservable();

  /* ----------------------------- leitura ----------------------------- */

  get cursosAtuais(): Curso[] {
    return this.cursos$.value;
  }

  get projetosAtuais(): Projeto[] {
    return this.projetos$.value;
  }

  get usuariosAtuais(): Usuario[] {
    return this.usuarios$.value;
  }

  get atividadesAtuais(): Atividade[] {
    return this.atividades$.value;
  }

  get entregasAtuais(): Entrega[] {
    return this.entregas$.value;
  }

  get materiaisAtuais(): Material[] {
    return this.materiais$.value;
  }

  nomeCurso(cursoId: string | null): string {
    if (cursoId === null) {
      return 'Todos os cursos';
    }

    const curso = this.cursosAtuais.find((c) => c.id === cursoId);
    return curso ? rotuloCurso(curso) : '—';
  }

  nomeProjeto(projetoId: string): string {
    return this.projetosAtuais.find((p) => p.id === projetoId)?.nome ?? '—';
  }

  projetosDoCurso(cursoId: string): Projeto[] {
    return this.projetosAtuais.filter((p) => p.cursoId === cursoId);
  }

  /** Grupo a que o aluno pertence. Um aluno participa de um projeto só. */
  projetoDoAluno(alunoId: string): Projeto | undefined {
    return this.projetosAtuais.find((p) => p.integrantes.includes(alunoId));
  }

  integrantesDoProjeto(projetoId: string): Usuario[] {
    const projeto = this.projetosAtuais.find((p) => p.id === projetoId);

    if (!projeto) {
      return [];
    }

    return projeto.integrantes
      .map((id) => this.usuariosAtuais.find((u) => u.id === id))
      .filter((u): u is Usuario => u !== undefined);
  }

  /* ----------------------------- escrita ----------------------------- */

  adicionarUsuario(usuario: Usuario): void {
    this.usuarios$.next([...this.usuariosAtuais, usuario]);
  }

  substituirUsuarios(usuarios: Usuario[]): void {
    this.usuarios$.next(usuarios);
  }

  adicionarAtividade(atividade: Atividade): void {
    this.atividades$.next([...this.atividadesAtuais, atividade]);
  }

  removerAtividade(atividadeId: string): void {
    this.atividades$.next(
      this.atividadesAtuais.filter((a) => a.id !== atividadeId),
    );
    this.entregas$.next(
      this.entregasAtuais.filter((e) => e.atividadeId !== atividadeId),
    );
  }

  adicionarMaterial(material: Material): void {
    this.materiais$.next([material, ...this.materiaisAtuais]);
  }

  removerMaterial(materialId: string): void {
    this.materiais$.next(
      this.materiaisAtuais.filter((m) => m.id !== materialId),
    );
  }

  /** Registra (ou desfaz) a entrega de um projeto numa atividade. */
  definirEntrega(
    atividadeId: string,
    projetoId: string,
    entregueEm: string | null,
    detalhes?: { arquivoNome?: string; observacao?: string },
  ): void {
    const existente = this.entregasAtuais.find(
      (e) => e.atividadeId === atividadeId && e.projetoId === projetoId,
    );

    if (entregueEm === null) {
      if (existente) {
        this.entregas$.next(
          this.entregasAtuais.filter((e) => e.id !== existente.id),
        );
      }
      return;
    }

    if (existente) {
      this.entregas$.next(
        this.entregasAtuais.map((e) =>
          e.id === existente.id ? { ...e, entregueEm, ...detalhes } : e,
        ),
      );
      return;
    }

    this.entregas$.next([
      ...this.entregasAtuais,
      {
        id: `e-${crypto.randomUUID()}`,
        atividadeId,
        projetoId,
        entregueEm,
        ...detalhes,
      },
    ]);
  }

  /* --------------------------- regras de status --------------------------- */

  /**
   * Status da entrega de um projeto numa atividade. Sem registro de entrega,
   * o que decide é o prazo: vencido vira atraso, não vencido fica pendente.
   */
  statusEntrega(
    atividade: Atividade,
    projetoId: string,
    agora = new Date(),
  ): StatusEntrega {
    const entrega = this.entregasAtuais.find(
      (e) => e.atividadeId === atividade.id && e.projetoId === projetoId,
    );
    const prazo = new Date(atividade.prazo);

    if (entrega?.entregueEm) {
      return new Date(entrega.entregueEm) > prazo
        ? 'ENTREGUE_COM_ATRASO'
        : 'ENTREGUE';
    }

    return agora > prazo ? 'ATRASADO' : 'PENDENTE';
  }

  /**
   * Situação agregada da atividade. Sem `cursoId`, considera todos os projetos
   * da plataforma; com ele, só os projetos daquele curso.
   */
  statusAtividade(
    atividade: Atividade,
    cursoId?: string,
    agora = new Date(),
  ): StatusAtividade {
    const projetos = cursoId
      ? this.projetosDoCurso(cursoId)
      : this.projetosAtuais;

    if (projetos.length === 0) {
      return agora > new Date(atividade.prazo) ? 'ATRASADA' : 'EM_ANDAMENTO';
    }

    const statuses = projetos.map((p) =>
      this.statusEntrega(atividade, p.id, agora),
    );

    if (statuses.every((s) => s === 'ENTREGUE' || s === 'ENTREGUE_COM_ATRASO')) {
      return 'CONCLUIDA';
    }

    return statuses.some((s) => s === 'ATRASADO') ? 'ATRASADA' : 'EM_ANDAMENTO';
  }

  /** Nome do arquivo entregue por um projeto numa atividade, se houver. */
  arquivoEntrega(atividadeId: string, projetoId: string): string | undefined {
    return this.entregasAtuais.find(
      (e) => e.atividadeId === atividadeId && e.projetoId === projetoId,
    )?.arquivoNome;
  }

  /** Quantos projetos já entregaram a atividade. */
  entregasRecebidas(atividadeId: string, cursoId?: string): number {
    const ids = new Set(
      (cursoId ? this.projetosDoCurso(cursoId) : this.projetosAtuais).map(
        (p) => p.id,
      ),
    );

    return this.entregasAtuais.filter(
      (e) =>
        e.atividadeId === atividadeId &&
        e.entregueEm !== null &&
        ids.has(e.projetoId),
    ).length;
  }

  totalProjetos(cursoId?: string): number {
    return cursoId
      ? this.projetosDoCurso(cursoId).length
      : this.projetosAtuais.length;
  }
}
