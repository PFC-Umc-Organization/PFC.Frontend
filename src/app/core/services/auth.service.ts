import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap, throwError } from 'rxjs';

import {
  Credenciais,
  NovoUsuario,
  RespostaAutenticacao,
  RespostaCadastro,
  Usuario,
  ehDesafio,
} from '../models';
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

  /** Troca de senha pendente do último login (conta criada pela coordenação). */
  private readonly _desafio = signal<{ email: string; sessao: string } | null>(null);
  readonly desafioPendente = computed(() => this._desafio() !== null);
  readonly emailDoDesafio = computed(() => this._desafio()?.email ?? '');

  /** `'nova-senha'` quando a pessoa precisa trocar a senha temporária. */
  entrar(credenciais: Credenciais): Observable<'entrou' | 'nova-senha'> {
    this._desafio.set(null);
    return this.usuarios.autenticar(credenciais).pipe(
      map((resposta) => {
        if (ehDesafio(resposta)) {
          this._desafio.set({ email: credenciais.email.trim(), sessao: resposta.sessao });
          return 'nova-senha' as const;
        }
        this.iniciarSessao(resposta);
        return 'entrou' as const;
      }),
    );
  }

  definirNovaSenha(senha: string): Observable<void> {
    const desafio = this._desafio();
    if (!desafio) {
      return throwError(() => new Error('Entre de novo com a senha temporária do e-mail.'));
    }
    return this.usuarios.definirNovaSenha(desafio.email, desafio.sessao, senha).pipe(
      tap((resposta) => {
        this._desafio.set(null);
        this.iniciarSessao(resposta);
      }),
      map(() => undefined),
    );
  }

  esqueciSenha(email: string): Observable<RespostaCadastro> {
    return this.usuarios.esqueciSenha(email);
  }

  redefinirSenha(email: string, codigo: string, senha: string): Observable<RespostaCadastro> {
    return this.usuarios.redefinirSenha(email, codigo, senha);
  }

  /**
   * Lê o usuário de novo no backend: o aluno pré-autorizado depois de entrar
   * passa a ver a turma sem sair e entrar de novo.
   */
  atualizarUsuario(): Observable<Usuario> {
    return this.usuarios.eu().pipe(
      tap((usuario) => {
        const sessao = this._sessao();
        if (sessao) {
          this.iniciarSessao({ usuario: { ...sessao.usuario, ...usuario }, token: sessao.token });
        }
      }),
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

  private iniciarSessao({ usuario, token }: RespostaAutenticacao): void {
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
