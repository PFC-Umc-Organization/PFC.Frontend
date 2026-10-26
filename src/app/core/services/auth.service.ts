import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap, throwError } from 'rxjs';

import { AuthResult, Credentials, MessageResponse, NewUser, User, isNewPasswordChallenge } from '../models';
import { UserService } from './user.service';

/** Stored as `{ usuario, token }`; renaming the fields would sign everyone out. */
const SESSION_KEY = 'athena.sessao';

interface Session {
  usuario: User;
  token: string;
}

/** Reads the JWT `exp` without checking the signature (API Gateway does). */
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly users = inject(UserService);

  private readonly session = signal<Session | null>(this.restoreSession());

  readonly user = computed(() => this.session()?.usuario ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly authenticated = computed(() => this.session() !== null);
  readonly role = computed(() => this.session()?.usuario.perfil ?? null);
  readonly firstName = computed(() => this.session()?.usuario.nome.split(' ').at(0) ?? '');

  /** The pending password change of the last sign-in. */
  private readonly challenge = signal<{ email: string; session: string } | null>(null);
  readonly hasPendingChallenge = computed(() => this.challenge() !== null);
  readonly challengeEmail = computed(() => this.challenge()?.email ?? '');

  /** `'new-password'` when the temporary password must be replaced first. */
  signIn(credentials: Credentials): Observable<'signed-in' | 'new-password'> {
    this.challenge.set(null);
    return this.users.login(credentials).pipe(
      map((result) => {
        if (isNewPasswordChallenge(result)) {
          this.challenge.set({ email: credentials.email.trim(), session: result.sessao });
          return 'new-password' as const;
        }
        this.startSession(result);
        return 'signed-in' as const;
      }),
    );
  }

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

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.users.forgotPassword(email);
  }

  resetPassword(email: string, code: string, password: string): Observable<MessageResponse> {
    return this.users.resetPassword(email, code, password);
  }

  /** Reads the user again, so a student enrolled after signing in sees the cohort. */
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

  /** Does not sign in: the e-mail must be confirmed first. */
  signUp(user: NewUser): Observable<MessageResponse> {
    return this.users.register(user);
  }

  confirm(email: string, code: string): Observable<MessageResponse> {
    return this.users.confirm(email, code);
  }

  resendCode(email: string): Observable<MessageResponse> {
    return this.users.resendCode(email);
  }

  signOut(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  private startSession({ usuario, token }: AuthResult): void {
    this.session.set({ usuario, token });
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ usuario, token }));
    } catch {}
  }

  /** An expired saved session is dropped instead of opening the app to a wall of 401s. */
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
