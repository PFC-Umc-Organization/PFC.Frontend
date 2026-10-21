import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AtualizacaoUsuario,
  Credenciais,
  NovaConta,
  NovoUsuario,
  Perfil,
  RespostaAutenticacao,
  RespostaCadastro,
  RespostaLogin,
  Usuario,
} from '../models';
import { erroHttp } from './http-erro';

export interface FiltroUsuario {
  busca?: string;
  perfil?: Perfil | 'TODOS';
}

export abstract class UsuarioService {
  /**
   * Se editar/excluir conta é suportado. O backend real ainda não tem rota
   * pra isso (exigiria AdminUpdateUserAttributes/AdminDeleteUser no
   * Cognito), então a tela de Usuários esconde essas ações.
   */
  abstract readonly edicaoDisponivel: boolean;
  abstract listar(filtro?: FiltroUsuario): Observable<Usuario[]>;
  abstract criar(novo: NovoUsuario): Observable<RespostaCadastro>;
  /** Cadastro de orientador/admin pelo administrador (POST /admin/usuarios). */
  abstract criarConta(nova: NovaConta): Observable<RespostaCadastro>;
  /** Confirma a conta com o código de 6 dígitos enviado por e-mail. */
  abstract confirmar(email: string, codigo: string): Observable<RespostaCadastro>;
  abstract reenviarCodigo(email: string): Observable<RespostaCadastro>;
  abstract autenticar(credenciais: Credenciais): Observable<RespostaLogin>;
  /** Troca a senha temporária no primeiro acesso (conta criada pela coordenação). */
  abstract definirNovaSenha(
    email: string,
    sessao: string,
    senha: string,
  ): Observable<RespostaAutenticacao>;
  /** Manda o código de redefinição; a resposta não diz se a conta existe. */
  abstract esqueciSenha(email: string): Observable<RespostaCadastro>;
  abstract redefinirSenha(
    email: string,
    codigo: string,
    senha: string,
  ): Observable<RespostaCadastro>;
  /** O usuário logado, lido de novo (turma do aluno atualizada). */
  abstract eu(): Observable<Usuario>;
  abstract atualizar(
    usuarioId: string,
    dados: AtualizacaoUsuario,
  ): Observable<Usuario>;
  abstract remover(usuarioId: string): Observable<void>;
}

function aplicarFiltro(
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
      u.email.toLowerCase().includes(termo) ||
      (u.rgm ?? '').includes(termo);
    return casaPerfil && casaBusca;
  });
}

@Injectable()
export class UsuarioHttpService extends UsuarioService {
  private readonly http = inject(HttpClient);

  override readonly edicaoDisponivel = false;

  /**
   * Uma chamada por sessão, compartilhada por todas as telas (Usuários,
   * Início, Gestão, Meu PFC) — sem isso, cada tecla na busca da tela de
   * Usuários viraria um ListUsers no Cognito. O login zera o cache, pra
   * quem entra depois (com outro perfil) não herdar a lista do anterior.
   * Se a chamada falhar, o shareReplay descarta o erro e a próxima tenta
   * de novo.
   */
  private cache$: Observable<Usuario[]> | null = null;

  override listar(filtro: FiltroUsuario = {}): Observable<Usuario[]> {
    this.cache$ ??= this.http
      .get<Usuario[]>(`${environment.apiBaseUrl}/usuarios`)
      .pipe(
        // Pro aluno o backend omite o e-mail (dado pessoal).
        map((usuarios) => usuarios.map((u) => ({ ...u, email: u.email ?? '' }))),
        catchError(erroHttp),
        shareReplay(1),
      );

    return this.cache$.pipe(map((usuarios) => aplicarFiltro(usuarios, filtro)));
  }

  override autenticar(credenciais: Credenciais): Observable<RespostaLogin> {
    this.cache$ = null;
    return this.http
      .post<RespostaLogin>(`${environment.apiBaseUrl}/auth/login`, credenciais)
      .pipe(catchError(erroHttp));
  }

  override definirNovaSenha(
    email: string,
    sessao: string,
    senha: string,
  ): Observable<RespostaAutenticacao> {
    return this.http
      .post<RespostaAutenticacao>(`${environment.apiBaseUrl}/auth/nova-senha`, {
        email,
        sessao,
        senha,
      })
      .pipe(catchError(erroHttp));
  }

  override esqueciSenha(email: string): Observable<RespostaCadastro> {
    return this.http
      .post<RespostaCadastro>(`${environment.apiBaseUrl}/auth/esqueci-senha`, { email })
      .pipe(catchError(erroHttp));
  }

  override redefinirSenha(
    email: string,
    codigo: string,
    senha: string,
  ): Observable<RespostaCadastro> {
    return this.http
      .post<RespostaCadastro>(`${environment.apiBaseUrl}/auth/redefinir-senha`, {
        email,
        codigo,
        senha,
      })
      .pipe(catchError(erroHttp));
  }

  override eu(): Observable<Usuario> {
    return this.http
      .get<Usuario>(`${environment.apiBaseUrl}/me`)
      .pipe(catchError(erroHttp));
  }

  override criar(novo: NovoUsuario): Observable<RespostaCadastro> {
    return this.http
      .post<RespostaCadastro>(`${environment.apiBaseUrl}/auth/registrar`, novo)
      .pipe(catchError(erroHttp));
  }

  override criarConta(nova: NovaConta): Observable<RespostaCadastro> {
    return this.http
      .post<RespostaCadastro>(`${environment.apiBaseUrl}/admin/usuarios`, nova)
      .pipe(
        tap(() => {
          this.cache$ = null;
        }),
        catchError(erroHttp),
      );
  }

  override confirmar(
    email: string,
    codigo: string,
  ): Observable<RespostaCadastro> {
    return this.http
      .post<RespostaCadastro>(`${environment.apiBaseUrl}/auth/confirmar`, {
        email,
        codigo,
      })
      .pipe(catchError(erroHttp));
  }

  override reenviarCodigo(email: string): Observable<RespostaCadastro> {
    return this.http
      .post<RespostaCadastro>(
        `${environment.apiBaseUrl}/auth/reenviar-codigo`,
        { email },
      )
      .pipe(catchError(erroHttp));
  }

  override atualizar(): Observable<Usuario> {
    return throwError(
      () => new Error('Editar usuário ainda não está disponível no backend.'),
    );
  }

  override remover(): Observable<void> {
    return throwError(
      () => new Error('Excluir usuário ainda não está disponível no backend.'),
    );
  }
}
