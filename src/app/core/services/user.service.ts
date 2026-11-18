import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthResult,
  Credentials,
  LoginResult,
  MfaKind,
  MfaSetup,
  MessageResponse,
  NewAccount,
  NewUser,
  Role,
  User,
} from '../models';
import { toApiError } from './http-error';

// Tipo
export interface UserFilter {
  search?: string;
  role?: Role | 'TODOS';
  // Turma
  cohortId?: string;
}

// Serviço
export abstract class UserService {
  // ---------------------------------------------------------------------------
  // Listagem
  // ---------------------------------------------------------------------------

  abstract list(filter?: UserFilter): Observable<User[]>;

  // ---------------------------------------------------------------------------
  // Cadastro
  // ---------------------------------------------------------------------------

  abstract register(user: NewUser): Observable<MessageResponse>;
  // Criação
  abstract createAccount(account: NewAccount): Observable<MessageResponse>;
  // Confirmação
  abstract confirm(email: string, code: string): Observable<MessageResponse>;
  // Reenvio
  abstract resendCode(email: string): Observable<MessageResponse>;

  // ---------------------------------------------------------------------------
  // Autenticação
  // ---------------------------------------------------------------------------

  abstract login(credentials: Credentials): Observable<LoginResult>;
  // Troca de senha
  abstract setNewPassword(email: string, session: string, password: string): Observable<AuthResult>;
  // MFA
  abstract startMfaSetup(email: string, session: string): Observable<MfaSetup>;
  // Verificação
  abstract verifyMfa(email: string, session: string, kind: MfaKind, code: string): Observable<AuthResult>;
  // Recuperação
  abstract forgotPassword(email: string): Observable<MessageResponse>;
  // Redefinição
  abstract resetPassword(email: string, code: string, password: string): Observable<MessageResponse>;
  // Perfil
  abstract me(): Observable<User>;

  // ---------------------------------------------------------------------------
  // Contas
  // ---------------------------------------------------------------------------

  // Renomeação
  abstract rename(userId: string, name: string): Observable<MessageResponse>;
  // Troca de perfil
  abstract changeRole(userId: string, role: 'ORIENTADOR' | 'ADMIN'): Observable<MessageResponse>;
  // Desativação
  abstract disable(userId: string): Observable<MessageResponse>;
  // Ativação
  abstract enable(userId: string): Observable<MessageResponse>;
  // Reenvio
  abstract resendInvitation(userId: string): Observable<MessageResponse>;
  // Alternância
  abstract toggleMfa(id: string, ativo: boolean): Observable<MessageResponse>;
}

// Filtro
function applyFilter(users: User[], { search, role, cohortId }: UserFilter): User[] {
  const term = (search ?? '').trim().toLowerCase();
  return users.filter((u) => {
    const roleMatches = !role || role === 'TODOS' || u.perfil === role;
    const searchMatches =
      term.length === 0 ||
      u.nome.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.rgm ?? '').includes(term);
    const cohortMatches = !cohortId || u.cursoIds.includes(cohortId);
    return roleMatches && searchMatches && cohortMatches;
  });
}

// Serviço
@Injectable()
export class UserHttpService extends UserService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private cache$: Observable<User[]> | null = null;

  // ---------------------------------------------------------------------------
  // Listagem
  // ---------------------------------------------------------------------------

  override list(filter: UserFilter = {}): Observable<User[]> {
    this.cache$ ??= this.http.get<User[]>(`${this.base}/usuarios`).pipe(
      map((users) => users.map((u) => ({ ...u, email: u.email ?? '' }))),
      catchError(toApiError),
      shareReplay(1),
    );
    return this.cache$.pipe(map((users) => applyFilter(users, filter)));
  }

  // ---------------------------------------------------------------------------
  // Autenticação
  // ---------------------------------------------------------------------------

  override login(credentials: Credentials): Observable<LoginResult> {
    this.cache$ = null;
    return this.http.post<LoginResult>(`${this.base}/auth/login`, credentials).pipe(catchError(toApiError));
  }

  // Troca de senha
  override setNewPassword(email: string, session: string, password: string): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(`${this.base}/auth/nova-senha`, { email, sessao: session, senha: password })
      .pipe(catchError(toApiError));
  }

  // MFA
  override startMfaSetup(email: string, session: string): Observable<MfaSetup> {
    return this.http.post<MfaSetup>(`${this.base}/auth/mfa/configurar`, { email, sessao: session }).pipe(catchError(toApiError));
  }

  // Verificação
  override verifyMfa(email: string, session: string, kind: MfaKind, code: string): Observable<AuthResult> {
    return this.http
      .post<AuthResult>(`${this.base}/auth/mfa/verificar`, { email, sessao: session, desafio: kind, codigo: code })
      .pipe(catchError(toApiError));
  }

  // Recuperação
  override forgotPassword(email: string): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.base}/auth/esqueci-senha`, { email })
      .pipe(catchError(toApiError));
  }

  // Redefinição
  override resetPassword(email: string, code: string, password: string): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.base}/auth/redefinir-senha`, { email, codigo: code, senha: password })
      .pipe(catchError(toApiError));
  }

  // Perfil
  override me(): Observable<User> {
    return this.http.get<User>(`${this.base}/me`).pipe(catchError(toApiError));
  }

  // ---------------------------------------------------------------------------
  // Cadastro
  // ---------------------------------------------------------------------------

  override register(user: NewUser): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/auth/registrar`, user).pipe(catchError(toApiError));
  }

  // Criação
  override createAccount(account: NewAccount): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/admin/usuarios`, account).pipe(
      tap(() => (this.cache$ = null)),
      catchError(toApiError),
    );
  }

  // ---------------------------------------------------------------------------
  // Contas
  // ---------------------------------------------------------------------------

  // Renomeação
  override rename(userId: string, name: string): Observable<MessageResponse> {
    return this.change(this.http.put<MessageResponse>(`${this.accounts(userId)}/nome`, { nome: name }));
  }

  // Troca de perfil
  override changeRole(userId: string, role: 'ORIENTADOR' | 'ADMIN'): Observable<MessageResponse> {
    return this.change(this.http.put<MessageResponse>(`${this.accounts(userId)}/perfil`, { perfil: role }));
  }

  // Desativação
  override disable(userId: string): Observable<MessageResponse> {
    return this.change(this.http.post<MessageResponse>(`${this.accounts(userId)}/desativar`, {}));
  }

  // Ativação
  override enable(userId: string): Observable<MessageResponse> {
    return this.change(this.http.post<MessageResponse>(`${this.accounts(userId)}/reativar`, {}));
  }

  // Reenvio
  override resendInvitation(userId: string): Observable<MessageResponse> {
    return this.change(this.http.post<MessageResponse>(`${this.accounts(userId)}/convite`, {}));
  }

  // Alternância
  override toggleMfa(id: string, ativo: boolean): Observable<MessageResponse> {
    return this.change(this.http.put<MessageResponse>(`${this.accounts(id)}/mfa`, { ativo }));
  }

  // Contas
  private accounts(userId: string): string {
    return `${this.base}/admin/usuarios/${encodeURIComponent(userId)}`;
  }

  // Alteração
  private change(request: Observable<MessageResponse>): Observable<MessageResponse> {
    return request.pipe(
      tap(() => (this.cache$ = null)),
      catchError(toApiError),
    );
  }

  // ---------------------------------------------------------------------------
  // Confirmação
  // ---------------------------------------------------------------------------

  override confirm(email: string, code: string): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.base}/auth/confirmar`, { email, codigo: code })
      .pipe(catchError(toApiError));
  }

  // Reenvio
  override resendCode(email: string): Observable<MessageResponse> {
    return this.http
      .post<MessageResponse>(`${this.base}/auth/reenviar-codigo`, { email })
      .pipe(catchError(toApiError));
  }
}
