import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap, throwError } from 'rxjs';

import { AuthResult, Credentials, MessageResponse, MfaKind, NewUser, User, isMfaChallenge, isNewPasswordChallenge } from '../models';
import { UserService } from './user.service';

const SESSION_KEY = 'athena.sessao';
const ISSUER = 'Rafa Manager';
const CHALLENGE_EXPIRED = 'A verificação expirou. Entre novamente.';

// Tipo
interface Session {
  usuario: User;
  token: string;
}

// Expiração
function tokenExpired(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64)) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

// Serviço
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly users = inject(UserService);

  private readonly session = signal<Session | null>(this.restoreSession());

  readonly user = computed(() => this.session()?.usuario ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly authenticated = computed(() => this.session() !== null);
  readonly role = computed(() => this.session()?.usuario.perfil ?? null);
  readonly firstName = computed(() => this.session()?.usuario.nome.split(' ').at(0) ?? '');

  private readonly challenge = signal<{ email: string; session: string; mfa?: MfaKind } | null>(null);
  readonly hasPendingChallenge = computed(() => this.challenge() !== null && !this.challenge()?.mfa);
  readonly challengeEmail = computed(() => this.challenge()?.email ?? '');

  // ---------------------------------------------------------------------------
  // Autenticação
  // ---------------------------------------------------------------------------

  // Entrada
  signIn(credentials: Credentials): Observable<'signed-in' | 'new-password' | MfaKind> {
    this.challenge.set(null);
    return this.users.login(credentials).pipe(
      map((result) => {
        if (isNewPasswordChallenge(result)) {
          this.challenge.set({ email: credentials.email.trim(), session: result.sessao });
          return 'new-password' as const;
        }
        if (isMfaChallenge(result)) {
          this.challenge.set({ email: credentials.email.trim(), session: result.sessao, mfa: result.desafio });
          return result.desafio;
        }
        this.startSession(result);
        return 'signed-in' as const;
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // MFA
  // ---------------------------------------------------------------------------

  // Configuração
  startMfaSetup(): Observable<{ secret: string; uri: string }> {
    const challenge = this.challenge();
    if (!challenge) {
      return throwError(() => new Error(CHALLENGE_EXPIRED));
    }
    return this.users.startMfaSetup(challenge.email, challenge.session).pipe(
      tap(({ sessao }) => this.challenge.set({ ...challenge, session: sessao })),
      map(({ segredo }) => ({
        secret: segredo,
        uri: `otpauth://totp/${encodeURIComponent(`${ISSUER}:${challenge.email}`)}?secret=${segredo}&issuer=${encodeURIComponent(ISSUER)}`,
      })),
    );
  }

  // Verificação
  verifyMfa(code: string): Observable<void> {
    const challenge = this.challenge();
    if (!challenge?.mfa) {
      return throwError(() => new Error(CHALLENGE_EXPIRED));
    }
    return this.users.verifyMfa(challenge.email, challenge.session, challenge.mfa, code).pipe(
      tap((result) => {
        this.challenge.set(null);
        this.startSession(result);
      }),
      map(() => undefined),
    );
  }

  // Cancelamento
  cancelChallenge(): void {
    this.challenge.set(null);
  }

  // Troca de senha
  setNewPassword(password: string): Observable<void> {
    const challenge = this.challenge();
    if (!challenge) {
      return throwError(() => new Error('A sessão expirou. Entre novamente com a senha temporária recebida por e-mail.'));
    }
    return this.users.setNewPassword(challenge.email, challenge.session, password).pipe(
      tap((result) => {
        this.challenge.set(null);
        this.startSession(result);
      }),
      map(() => undefined),
    );
  }

  // ---------------------------------------------------------------------------
  // Senha
  // ---------------------------------------------------------------------------

  // Recuperação
  forgotPassword(email: string): Observable<MessageResponse> {
    return this.users.forgotPassword(email);
  }

  // Redefinição
  resetPassword(email: string, code: string, password: string): Observable<MessageResponse> {
    return this.users.resetPassword(email, code, password);
  }

  // ---------------------------------------------------------------------------
  // Perfil
  // ---------------------------------------------------------------------------

  // Atualização
  refreshUser(): Observable<User> {
    return this.users.me().pipe(
      tap((user) => {
        const session = this.session();
        if (session) {
          this.startSession({ usuario: { ...session.usuario, ...user }, token: session.token });
        }
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Cadastro
  // ---------------------------------------------------------------------------

  signUp(user: NewUser): Observable<MessageResponse> {
    return this.users.register(user);
  }

  // Confirmação
  confirm(email: string, code: string): Observable<MessageResponse> {
    return this.users.confirm(email, code);
  }

  // Reenvio
  resendCode(email: string): Observable<MessageResponse> {
    return this.users.resendCode(email);
  }

  // ---------------------------------------------------------------------------
  // Sessão
  // ---------------------------------------------------------------------------

  // Saída
  signOut(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  // Sessão
  private startSession({ usuario, token }: AuthResult): void {
    this.session.set({ usuario, token });
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ usuario, token }));
    } catch {}
  }

  // Restauração
  private restoreSession(): Session | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as Session;
      if (tokenExpired(session.token)) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }
}
