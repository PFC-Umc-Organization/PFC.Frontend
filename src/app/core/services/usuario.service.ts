import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, of, throwError } from 'rxjs';

import {
  Credenciais,
  NovoUsuario,
  NovoUsuarioProfessor,
  Perfil,
  Usuario,
} from '../models';
import { SENHA_MOCK } from './dados-mock';
import { MemoriaStore } from './memoria.store';

export interface FiltroUsuario {
  busca?: string;
  perfil?: Perfil | 'TODOS';
}

export abstract class UsuarioService {
  abstract listar(filtro?: FiltroUsuario): Observable<Usuario[]>;
  abstract criar(novo: NovoUsuario): Observable<Usuario>;
  /** Pré-cadastro feito pelo professor, só com RGM e nome (sempre um aluno). */
  abstract criarPorProfessor(novo: NovoUsuarioProfessor): Observable<Usuario>;
  abstract autenticar(credenciais: Credenciais): Observable<Usuario>;
}

@Injectable()
export class UsuarioMockService extends UsuarioService {
  private readonly store = inject(MemoriaStore);

  override listar(filtro: FiltroUsuario = {}): Observable<Usuario[]> {
    return this.store.usuarios.pipe(
      map((usuarios) => this.aplicarFiltro(usuarios, filtro)),
    );
  }

  override criar(novo: NovoUsuario): Observable<Usuario> {
    const emailEmUso = this.store.usuariosAtuais.some(
      (u) => u.email.toLowerCase() === novo.email.trim().toLowerCase(),
    );

    if (emailEmUso) {
      return throwError(
        () => new Error('Já existe uma conta com esse e-mail.'),
      ).pipe(delay(250));
    }

    const usuario: Usuario = {
      id: `u-${crypto.randomUUID()}`,
      nome: novo.nome.trim(),
      email: novo.email.trim().toLowerCase(),
      perfil: novo.perfil,
      status: 'ATIVO',
      cursoIds: this.cursoIdsPadrao(novo.perfil),
    };

    this.store.adicionarUsuario(usuario);
    return of(usuario).pipe(delay(400));
  }

  override criarPorProfessor(novo: NovoUsuarioProfessor): Observable<Usuario> {
    const rgm = novo.rgm.trim();
    const rgmEmUso = this.store.usuariosAtuais.some((u) => u.rgm === rgm);

    if (rgmEmUso) {
      return throwError(
        () => new Error('Já existe um usuário com esse RGM.'),
      ).pipe(delay(250));
    }

    const usuario: Usuario = {
      id: `u-${crypto.randomUUID()}`,
      nome: novo.nome.trim(),
      email: `${rgm}@athena.edu`,
      perfil: 'ALUNO',
      status: 'ATIVO',
      cursoIds: this.cursoIdsPadrao('ALUNO'),
      rgm,
    };

    this.store.adicionarUsuario(usuario);
    return of(usuario).pipe(delay(400));
  }

  private cursoIdsPadrao(perfil: Perfil): string[] {
    return perfil === 'ALUNO'
      ? ['c-eng-noite']
      : ['c-eng-noite', 'c-eng-manha', 'c-si-noite', 'c-si-manha'];
  }

  /**
   * Login mockado: qualquer e-mail cadastrado entra com a senha `athena123`.
   * Quando o backend em Go subir, esta implementação é substituída por uma
   * que faz POST /auth/login e guarda o JWT.
   */
  override autenticar(credenciais: Credenciais): Observable<Usuario> {
    const usuario = this.store.usuariosAtuais.find(
      (u) => u.email.toLowerCase() === credenciais.email.trim().toLowerCase(),
    );

    if (!usuario || credenciais.senha !== SENHA_MOCK) {
      return throwError(
        () => new Error('E-mail ou senha inválidos.'),
      ).pipe(delay(500));
    }

    return of(usuario).pipe(delay(500));
  }

  private aplicarFiltro(
    usuarios: Usuario[],
    { busca, perfil }: FiltroUsuario,
  ): Usuario[] {
    const termo = (busca ?? '').trim().toLowerCase();

    return usuarios.filter((u) => {
      const casaPerfil =
        !perfil || perfil === 'TODOS' ? true : u.perfil === perfil;
      const casaBusca =
        termo.length === 0 ||
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo);
      return casaPerfil && casaBusca;
    });
  }
}
