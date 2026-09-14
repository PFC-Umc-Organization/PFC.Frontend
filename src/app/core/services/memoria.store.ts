import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  Atividade,
  Curso,
  Entrega,
  Material,
  Matricula,
  Programa,
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
  MATRICULAS_SEED,
  PROGRAMAS_SEED,
  PROJETOS_SEED,
  USUARIOS_SEED,
} from './dados-mock';


@Injectable({ providedIn: 'root' })
export class MemoriaStore {
  private readonly cursos$ = new BehaviorSubject<Curso[]>([...CURSOS_SEED]);
  private readonly programas$ = new BehaviorSubject<Programa[]>([
    ...PROGRAMAS_SEED,
  ]);
  private readonly projetos$ = new BehaviorSubject<Projeto[]>([
    ...PROJETOS_SEED,
  ]);
  private readonly usuarios$ = new BehaviorSubject<Usuario[]>([
    ...USUARIOS_SEED,
  ]);
  private readonly matriculas$ = new BehaviorSubject<Matricula[]>([
    ...MATRICULAS_SEED,
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
  readonly programas = this.programas$.asObservable();
  readonly projetos = this.projetos$.asObservable();
  readonly usuarios = this.usuarios$.asObservable();
  readonly matriculas = this.matriculas$.asObservable();
  readonly atividades = this.atividades$.asObservable();
  readonly entregas = this.entregas$.asObservable();
  readonly materiais = this.materiais$.asObservable();

  /* ----------------------------- leitura ----------------------------- */

  get cursosAtuais(): Curso[] {
    return this.cursos$.value;
  }

  get programasAtuais(): Programa[] {
    return this.programas$.value;
  }

  get projetosAtuais(): Projeto[] {
    return this.projetos$.value;
  }

  get usuariosAtuais(): Usuario[] {
    return this.usuarios$.value;
  }

  get matriculasAtuais(): Matricula[] {
    return this.matriculas$.value;
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

  /** Programa (turma) já iniciado para este curso, se houver. */
  programaDoCurso(cursoId: string): Programa | undefined {
    return this.programasAtuais.find((p) => p.cursoId === cursoId);
  }

  projetosDoPrograma(programaId: string): Projeto[] {
    return this.projetosAtuais.filter((p) => p.programaId === programaId);
  }

  
  projetosDoCurso(cursoId: string): Projeto[] {
    const programa = this.programaDoCurso(cursoId);
    return programa ? this.projetosDoPrograma(programa.id) : [];
  }

 
  projetoDoAluno(rgm: string): Projeto | undefined {
    return this.projetosAtuais.find((p) => p.integrantes.includes(rgm));
  }

  integrantesDoProjeto(
    projetoId: string,
  ): { rgm: string; nome: string | null }[] {
    const projeto = this.projetosAtuais.find((p) => p.id === projetoId);

    if (!projeto) {
      return [];
    }

    return projeto.integrantes.map((rgm) => ({
      rgm,
      nome: this.usuariosAtuais.find((u) => u.rgm === rgm)?.nome ?? null,
    }));
  }

  /* ----------------------------- escrita ----------------------------- */

  adicionarUsuario(usuario: Usuario): void {
    this.usuarios$.next([...this.usuariosAtuais, usuario]);
  }

  atualizarUsuario(
    usuarioId: string,
    dados: Partial<Pick<Usuario, 'nome' | 'status'>> & { cursoId?: string },
  ): void {
    const { cursoId, ...resto } = dados;

    this.usuarios$.next(
      this.usuariosAtuais.map((u) =>
        u.id === usuarioId
          ? { ...u, ...resto, cursoIds: cursoId ? [cursoId] : u.cursoIds }
          : u,
      ),
    );
  }

 
  removerUsuario(usuarioId: string): void {
    const usuario = this.usuariosAtuais.find((u) => u.id === usuarioId);

    this.usuarios$.next(
      this.usuariosAtuais.filter((u) => u.id !== usuarioId),
    );
    this.projetos$.next(
      this.projetosAtuais.map((p) => ({
        ...p,
        integrantes: usuario?.rgm
          ? p.integrantes.filter((rgm) => rgm !== usuario.rgm)
          : p.integrantes,
        orientadorId:
          p.orientadorId === usuarioId ? undefined : p.orientadorId,
      })),
    );
  }

  adicionarPrograma(programa: Programa): void {
    this.programas$.next([...this.programasAtuais, programa]);
  }

  removerPrograma(programaId: string): void {
    this.programas$.next(
      this.programasAtuais.filter((p) => p.id !== programaId),
    );
  }

  adicionarProjeto(projeto: Projeto): void {
    this.projetos$.next([...this.projetosAtuais, projeto]);
  }

  adicionarIntegranteAoProjeto(projetoId: string, rgm: string): void {
    this.projetos$.next(
      this.projetosAtuais.map((p) =>
        p.id === projetoId && !p.integrantes.includes(rgm)
          ? { ...p, integrantes: [...p.integrantes, rgm] }
          : p,
      ),
    );
  }

  removerIntegranteDoProjeto(projetoId: string, rgm: string): void {
    this.projetos$.next(
      this.projetosAtuais.map((p) =>
        p.id === projetoId
          ? { ...p, integrantes: p.integrantes.filter((r) => r !== rgm) }
          : p,
      ),
    );
  }

  
  provisionarMatriculas(rgms: string[]): void {
    const existentes = new Set(this.matriculasAtuais.map((m) => m.rgm));
    const novas = rgms
      .filter((rgm) => !existentes.has(rgm))
      .map((rgm): Matricula => ({ rgm, status: 'ATIVO' }));

    this.matriculas$.next([...this.matriculasAtuais, ...novas]);
  }

  /** Remove RGMs da allowlist — não afeta nenhuma conta que já exista. */
  removerMatriculas(rgms: string[]): void {
    const alvo = new Set(rgms);
    this.matriculas$.next(
      this.matriculasAtuais.filter((m) => !alvo.has(m.rgm)),
    );
  }

  atualizarProjeto(
    projetoId: string,
    dados: Partial<Pick<Projeto, 'nome' | 'descricao'>>,
  ): void {
    this.projetos$.next(
      this.projetosAtuais.map((p) =>
        p.id === projetoId ? { ...p, ...dados } : p,
      ),
    );
  }

  definirOrientador(projetoId: string, orientadorId: string | null): void {
    this.projetos$.next(
      this.projetosAtuais.map((p) =>
        p.id === projetoId
          ? { ...p, orientadorId: orientadorId ?? undefined }
          : p,
      ),
    );
  }

  removerProjeto(projetoId: string): void {
    this.projetos$.next(
      this.projetosAtuais.filter((p) => p.id !== projetoId),
    );
    this.entregas$.next(
      this.entregasAtuais.filter((e) => e.projetoId !== projetoId),
    );
  }

  substituirUsuarios(usuarios: Usuario[]): void {
    this.usuarios$.next(usuarios);
  }

  adicionarAtividade(atividade: Atividade): void {
    this.atividades$.next([...this.atividadesAtuais, atividade]);
  }

  atualizarAtividade(
    atividadeId: string,
    dados: Partial<Pick<Atividade, 'titulo' | 'descricao' | 'prazo'>>,
  ): void {
    this.atividades$.next(
      this.atividadesAtuais.map((a) =>
        a.id === atividadeId ? { ...a, ...dados } : a,
      ),
    );
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

  arquivoEntrega(atividadeId: string, projetoId: string): string | undefined {
    return this.entregasAtuais.find(
      (e) => e.atividadeId === atividadeId && e.projetoId === projetoId,
    )?.arquivoNome;
  }

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
