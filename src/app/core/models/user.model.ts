export type Role = 'ALUNO' | 'ORIENTADOR' | 'ADMIN';

export type UserStatus = 'ATIVO' | 'INATIVO';

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: Role;
  status: UserStatus;
  cursoIds: string[];
  rgm?: string;
  /** false: the Cognito account exists but the e-mail is not confirmed yet. */
  confirmado?: boolean;
  /** A staff account still on the temporary password of its invitation. */
  aguardandoPrimeiroAcesso?: boolean;
}

export interface NewUser {
  nome: string;
  email: string;
  senha: string;
  perfil: Role;
}

export interface Credentials {
  email: string;
  senha: string;
}

export interface AuthResult {
  usuario: User;
  token: string;
}

/** Accounts created by the coordination must replace the temporary password first. */
export interface NewPasswordChallenge {
  desafio: 'NOVA_SENHA';
  sessao: string;
}

export type LoginResult = AuthResult | NewPasswordChallenge;

export function isNewPasswordChallenge(r: LoginResult): r is NewPasswordChallenge {
  return 'desafio' in r && r.desafio === 'NOVA_SENHA';
}

/** The User Pool policy: 8+ characters with upper, lower, digit and symbol. */
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const PASSWORD_HINT =
  'Ao menos 8 caracteres, com letra maiúscula, letra minúscula, número e símbolo.';

export interface MessageResponse {
  mensagem: string;
}

/** Body of POST /admin/usuarios; students only sign themselves up. */
export interface NewAccount {
  nome: string;
  email: string;
  perfil: 'ORIENTADOR' | 'ADMIN';
}

export const ROLE_LABEL: Record<Role, string> = {
  ALUNO: 'Aluno',
  ORIENTADOR: 'Orientador',
  ADMIN: 'Coordenação',
};

export function isStaff(role: Role | null): boolean {
  return role === 'ORIENTADOR' || role === 'ADMIN';
}

/**
 * A student's e-mail is always `<rgm>@alunos.umc.br` (enforced by the
 * Pre Sign-up trigger), the same rule as the backend's `actor.RGM`.
 */
export function rgmOf(user: User | null): string {
  if (!user) {
    return '';
  }
  if (user.rgm) {
    return user.rgm;
  }
  if (user.perfil !== 'ALUNO') {
    return '';
  }
  return user.email.split('@')[0] ?? '';
}
