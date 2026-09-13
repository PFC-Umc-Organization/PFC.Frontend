import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { Credenciais, NovoUsuario, RespostaCadastro, Usuario } from '../models';
import { UsuarioService } from './usuario.service';

const CHAVE_SESSAO = 'athena.sessao';

interface Sessao {
  usuario: Usuario;
  /** IdToken do Cognito — enviado como Bearer nas rotas protegidas. */
  token: string;
}

/**
 * Sessão do usuário.
 *
 * `entrar` fala com o Cognito (via `POST /auth/login` no backend) e recebe
 * usuário + token de volta. `cadastrar` NÃO loga automaticamente: o Cognito
 * pode exigir confirmação por e-mail antes do primeiro login.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usuarios = inject(UsuarioService);

  private readonly _sessao = signal<Sessao | null>(this.restaurarSessao());

  readonly usuario = computed(() => this._sessao()?.usuario ?? null);
  readonly token = computed(() => this._sessao()?.token ?? null);
  readonly autenticado = computed(() => this._sessao() !== null);

  readonly perfil = computed(() => this._sessao()?.usuario.perfil ?? null);

  readonly primeiroNome = computed(
    () => this._sessao()?.usuario.nome.split(' ').at(0) ?? '',
  );

  entrar(credenciais: Credenciais): Observable<Usuario> {
    return this.usuarios.autenticar(credenciais).pipe(
      tap(({ usuario, token }) => this.iniciarSessao(usuario, token)),
      map(({ usuario }) => usuario),
    );
  }

  /** Cadastro self-service do aluno. Não inicia sessão — ver confirmação por e-mail. */
  cadastrar(novo: NovoUsuario): Observable<RespostaCadastro> {
    return this.usuarios.criar(novo);
  }

  sair(): void {
    this._sessao.set(null);
    this.limparSessao();
  }

  private iniciarSessao(usuario: Usuario, token: string): void {
    this._sessao.set({ usuario, token });
    this.persistirSessao(usuario, token);
  }

  /* ------------------------- persistência local ------------------------- */

  private restaurarSessao(): Sessao | null {
    try {
      const bruto = localStorage.getItem(CHAVE_SESSAO);
      return bruto ? (JSON.parse(bruto) as Sessao) : null;
    } catch {
      return null;
    }
  }

  private persistirSessao(usuario: Usuario, token: string): void {
    try {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ usuario, token }));
    } catch {
      /* modo privado ou storage bloqueado — a sessão vive só em memória */
    }
  }

  private limparSessao(): void {
    try {
      localStorage.removeItem(CHAVE_SESSAO);
    } catch {
      /* idem */
    }
  }
}
