import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { Credenciais, NovoUsuario, Perfil, Usuario } from '../models';
import { UsuarioService } from './usuario.service';

const CHAVE_SESSAO = 'athena.sessao';

/**
 * Sessão do usuário.
 *
 * Hoje a autenticação é mockada pelo UsuarioService. Quando o backend em Go
 * entrar, só `entrar`/`cadastrar` mudam: passam a receber o JWT e guardá-lo
 * aqui — os guards e os componentes continuam iguais.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usuarios = inject(UsuarioService);

  private readonly _usuario = signal<Usuario | null>(this.restaurarSessao());

  /** Perfil pelo qual a interface está sendo renderizada ("Ver como"). */
  private readonly _perfilVisao = signal<Perfil | null>(null);

  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);

  /** Perfil real do usuário logado. */
  readonly perfil = computed<Perfil | null>(() => this._usuario()?.perfil ?? null);

  /** Perfil efetivo: o real, ou o escolhido no "Ver como" pelo professor. */
  readonly perfilVisao = computed<Perfil | null>(
    () => this._perfilVisao() ?? this.perfil(),
  );

  readonly ehProfessor = computed(() => this.perfil() === 'PROFESSOR');
  readonly vendoComoAluno = computed(() => this.perfilVisao() === 'ALUNO');

  readonly primeiroNome = computed(
    () => this._usuario()?.nome.split(' ').at(0) ?? '',
  );

  entrar(credenciais: Credenciais): Observable<Usuario> {
    return this.usuarios
      .autenticar(credenciais)
      .pipe(tap((usuario) => this.iniciarSessao(usuario)));
  }

  cadastrar(novo: NovoUsuario): Observable<Usuario> {
    return this.usuarios
      .criar(novo)
      .pipe(tap((usuario) => this.iniciarSessao(usuario)));
  }

  sair(): void {
    this._usuario.set(null);
    this._perfilVisao.set(null);
    this.limparSessao();
  }

  /**
   * Alterna a visão da interface. Só o professor pode inspecionar a visão do
   * aluno; o aluno não tem como espiar a área administrativa.
   */
  definirPerfilVisao(perfil: Perfil): void {
    if (!this.ehProfessor()) {
      return;
    }
    this._perfilVisao.set(perfil);
  }

  private iniciarSessao(usuario: Usuario): void {
    this._usuario.set(usuario);
    this._perfilVisao.set(null);
    this.persistirSessao(usuario);
  }

  /* ------------------------- persistência local ------------------------- */

  private restaurarSessao(): Usuario | null {
    try {
      const bruto = localStorage.getItem(CHAVE_SESSAO);
      return bruto ? (JSON.parse(bruto) as Usuario) : null;
    } catch {
      return null;
    }
  }

  private persistirSessao(usuario: Usuario): void {
    try {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuario));
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
