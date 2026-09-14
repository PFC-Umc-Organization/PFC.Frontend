import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, map, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AtualizacaoUsuario,
  Credenciais,
  NovoUsuario,
  Perfil,
  RespostaAutenticacao,
  RespostaCadastro,
  Usuario,
} from '../models';
import { SENHA_MOCK } from './dados-mock';
import { erroHttp } from './http-erro';
import { MemoriaStore } from './memoria.store';

export interface FiltroUsuario {
  busca?: string;
  perfil?: Perfil | 'TODOS';
}

export abstract class UsuarioService {
  abstract listar(filtro?: FiltroUsuario): Observable<Usuario[]>;
  abstract criar(novo: NovoUsuario): Observable<RespostaCadastro>;
  abstract autenticar(
    credenciais: Credenciais,
  ): Observable<RespostaAutenticacao>;
  abstract atualizar(
    usuarioId: string,
    dados: AtualizacaoUsuario,
  ): Observable<Usuario>;
  abstract remover(usuarioId: string): Observable<void>;
}

@Injectable()
export class UsuarioMockService extends UsuarioService {
  private readonly store = inject(MemoriaStore);

  override listar(filtro: FiltroUsuario = {}): Observable<Usuario[]> {
    return this.store.usuarios.pipe(
      map((usuarios) => this.aplicarFiltro(usuarios, filtro)),
    );
  }

  override criar(novo: NovoUsuario): Observable<RespostaCadastro> {
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
      perfil: 'ALUNO',
      status: 'ATIVO',
      cursoIds: this.cursoIdsPadrao('ALUNO'),
    };

    this.store.adicionarUsuario(usuario);
    return of({
      mensagem:
        'Cadastro recebido — no mock, sua conta já está pronta pra entrar.',
    }).pipe(delay(400));
  }

  protected cursoIdsPadrao(perfil: Perfil): string[] {
    return perfil === 'ALUNO'
      ? ['c-eng-noite']
      : ['c-eng-noite', 'c-eng-manha', 'c-si-noite', 'c-si-manha'];
  }

  
  override autenticar(
    credenciais: Credenciais,
  ): Observable<RespostaAutenticacao> {
    const usuario = this.store.usuariosAtuais.find(
      (u) => u.email.toLowerCase() === credenciais.email.trim().toLowerCase(),
    );

    if (!usuario || credenciais.senha !== SENHA_MOCK) {
      return throwError(
        () => new Error('E-mail ou senha inválidos.'),
      ).pipe(delay(500));
    }

    return of({ usuario, token: `mock-token-${usuario.id}` }).pipe(delay(500));
  }

  override atualizar(
    usuarioId: string,
    dados: AtualizacaoUsuario,
  ): Observable<Usuario> {
    this.store.atualizarUsuario(usuarioId, dados);
    const usuario = this.store.usuariosAtuais.find((u) => u.id === usuarioId);

    if (!usuario) {
      return throwError(() => new Error('Usuário não encontrado.'));
    }

    return of(usuario).pipe(delay(300));
  }

  override remover(usuarioId: string): Observable<void> {
    this.store.removerUsuario(usuarioId);
    return of(undefined).pipe(delay(300));
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


@Injectable()
export class UsuarioHttpService extends UsuarioMockService {
  private readonly http = inject(HttpClient);

  override autenticar(
    credenciais: Credenciais,
  ): Observable<RespostaAutenticacao> {
    return this.http
      .post<RespostaAutenticacao>(
        `${environment.apiBaseUrl}/auth/login`,
        credenciais,
      )
      .pipe(catchError(erroHttp));
  }

  override criar(novo: NovoUsuario): Observable<RespostaCadastro> {
    return this.http
      .post<RespostaCadastro>(`${environment.apiBaseUrl}/auth/registrar`, novo)
      .pipe(catchError(erroHttp));
  }
}
