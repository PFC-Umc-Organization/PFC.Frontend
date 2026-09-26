import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { Credenciais, NovoUsuario, RespostaCadastro, Usuario } from '../models';
import { UsuarioService } from './usuario.service';

const CHAVE_SESSAO = 'athena.sessao';

interface Sessao {
  usuario: Usuario;
  token: string;
}

/**
 * Lê o `exp` do JWT (sem validar assinatura — quem valida é o API Gateway).
 * Token ilegível conta como expirado. Tokens do mock (não-JWT) nunca expiram.
 */
function tokenExpirado(token: string): boolean {
  const partes = token.split('.');
  if (partes.length !== 3) return false;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64)) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}


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

  confirmar(email: string, codigo: string): Observable<RespostaCadastro> {
    return this.usuarios.confirmar(email, codigo);
  }

  reenviarCodigo(email: string): Observable<RespostaCadastro> {
    return this.usuarios.reenviarCodigo(email);
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
      if (!bruto) return null;
      const sessao = JSON.parse(bruto) as Sessao;
      // Sessão salva com token já vencido: descarta em vez de abrir o app
      // "logado" e tomar 401 em todas as chamadas.
      if (tokenExpirado(sessao.token)) {
        localStorage.removeItem(CHAVE_SESSAO);
        return null;
      }
      return sessao;
    } catch {
      return null;
    }
  }

  private persistirSessao(usuario: Usuario, token: string): void {
    try {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ usuario, token }));
    } catch {
    }
  }

  private limparSessao(): void {
    try {
      localStorage.removeItem(CHAVE_SESSAO);
    } catch {
    }
  }
}
