// ---------------------------------------------------------------------------
// Perfis
// ---------------------------------------------------------------------------

export type Role = 'ALUNO' | 'ORIENTADOR' | 'ADMIN';

export type UserStatus = 'ATIVO' | 'INATIVO';

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: Role;
  status: UserStatus;
  cursoIds: string[];
  rgm?: string;
  confirmado?: boolean;
  aguardandoPrimeiroAcesso?: boolean;
}

// Criação
export interface NewUser {
  nome: string;
  email: string;
  senha: string;
  perfil: Role;
}

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------

export interface Credentials {
  email: string;
  senha: string;
}

// Resultado
export interface AuthResult {
  usuario: User;
  token: string;
}

// Desafio
export interface NewPasswordChallenge {
  desafio: 'NOVA_SENHA';
  sessao: string;
}

export type LoginResult = AuthResult | NewPasswordChallenge;

// Verificação
export function isNewPasswordChallenge(r: LoginResult): r is NewPasswordChallenge {
  return 'desafio' in r && r.desafio === 'NOVA_SENHA';
}

// Senha
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const PASSWORD_HINT =
  'Ao menos 8 caracteres, com letra maiúscula, letra minúscula, número e símbolo.';

export interface MessageResponse {
  mensagem: string;
}

// ---------------------------------------------------------------------------
// Contas
// ---------------------------------------------------------------------------

export interface NewAccount {
  nome: string;
  email: string;
  perfil: 'ORIENTADOR' | 'ADMIN';
}

// Rótulos
export const ROLE_LABEL: Record<Role, string> = {
  ALUNO: 'Aluno',
  ORIENTADOR: 'Orientador',
  ADMIN: 'Coordenação',
};

// Verificação
export function isStaff(role: Role | null): boolean {
  return role === 'ORIENTADOR' || role === 'ADMIN';
}

// Extração
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
