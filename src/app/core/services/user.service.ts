import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthResult,
  Credentials,
  LoginResult,
  MessageResponse,
  NewAccount,
  NewUser,
  Role,
  User,
} from '../models';
import { toApiError } from './http-error';

export interface UserFilter {
  search?: string;
  role?: Role | 'TODOS';
}

export abstract class UserService {
  abstract list(filter?: UserFilter): Observable<User[]>;
  /** A student's self sign-up. */
  abstract register(user: NewUser): Observable<MessageResponse>;
  /** An advisor or admin account created by the coordination. */
  abstract createAccount(account: NewAccount): Observable<MessageResponse>;
  /** Confirms the account with the 6-digit code sent by e-mail. */
  abstract confirm(email: string, code: string): Observable<MessageResponse>;
  abstract resendCode(email: string): Observable<MessageResponse>;
  abstract login(credentials: Credentials): Observable<LoginResult>;
  /** Replaces the temporary password on the first sign-in. */
  abstract setNewPassword(email: string, session: string, password: string): Observable<AuthResult>;
  /** The answer does not tell whether the account exists. */
  abstract forgotPassword(email: string): Observable<MessageResponse>;
  abstract resetPassword(email: string, code: string, password: string): Observable<MessageResponse>;
  /** The signed-in user, read again (a student's cohort may have changed). */
  abstract me(): Observable<User>;
}

function applyFilter(users: User[], { search, role }: UserFilter): User[] {
  const term = (search ?? '').trim().toLowerCase();
  return users.filter((u) => {
    const roleMatches = !role || role === 'TODOS' || u.perfil === role;
    const searchMatches =
      term.length === 0 ||
      u.nome.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.rgm ?? '').includes(term);
    return roleMatches && searchMatches;
  });
}

@Injectable()
export class UserHttpService extends UserService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /**
   * One call per session shared by every screen; otherwise each key typed in
   * the Usuários search would be a Cognito ListUsers. Signing in clears it,
   * so the next person does not inherit the list. A failed call is not
   * cached.
   */
  private cache$: Observable<User[]> | null = null;

  override list(filter: UserFilter = {}): Observable<User[]> {
    this.cache$ ??= this.http.get<User[]>(`${this.base}/usuarios`).pipe(
      map((users) => users.map((u) => ({ ...u, email: u.email ?? '' }))),
      catchError(toApiError),
      shareReplay(1),
    );
    return this.cache$.pipe(map((users) => applyFilter(users, filter)));
  }

  override login(credentials: Credentials): Observable<LoginResult> {
    this.cache$ = null;
    return this.http.post<LoginResult>(`${this.base}/auth/login`, credentials).pipe(catchError(toApiError));
  }

  override setNewPassword(email: string, session: string, password: string): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(`${this.base}/auth/nova-senha`, { email, sessao: session, senha: password })
      .pipe(catchError(toApiError));
  }

  override forgotPassword(email: string): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.base}/auth/esqueci-senha`, { email })
      .pipe(catchError(toApiError));
  }

  override resetPassword(email: string, code: string, password: string): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.base}/auth/redefinir-senha`, { email, codigo: code, senha: password })
      .pipe(catchError(toApiError));
  }

  override me(): Observable<User> {
    return this.http.get<User>(`${this.base}/me`).pipe(catchError(toApiError));
  }

  override register(user: NewUser): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/auth/registrar`, user).pipe(catchError(toApiError));
  }

  override createAccount(account: NewAccount): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/admin/usuarios`, account).pipe(
      tap(() => (this.cache$ = null)),
      catchError(toApiError),
    );
  }

  override confirm(email: string, code: string): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.base}/auth/confirmar`, { email, codigo: code })
      .pipe(catchError(toApiError));
  }

  override resendCode(email: string): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.base}/auth/reenviar-codigo`, { email })
      .pipe(catchError(toApiError));
  }
}
