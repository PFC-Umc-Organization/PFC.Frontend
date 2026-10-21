export type Perfil = 'ALUNO' | 'ORIENTADOR' | 'ADMIN';

export type StatusUsuario = 'ATIVO' | 'INATIVO';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  status: StatusUsuario;
  cursoIds: string[];
  rgm?: string;
  /**
   * false = a conta existe no Cognito, mas o e-mail ainda não foi
   * confirmado (a pessoa ainda não consegue entrar).
   */
  confirmado?: boolean;
}

export interface NovoUsuario {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
}

export interface Credenciais {
  email: string;
  senha: string;
}

export interface RespostaAutenticacao {
  usuario: Usuario;
  token: string;
}

/**
 * Conta criada pela coordenação entra com a senha temporária do e-mail; o
 * Cognito exige trocá-la antes do primeiro acesso.
 */
export interface DesafioNovaSenha {
  desafio: 'NOVA_SENHA';
  sessao: string;
}

export type RespostaLogin = RespostaAutenticacao | DesafioNovaSenha;

export function ehDesafio(r: RespostaLogin): r is DesafioNovaSenha {
  return 'desafio' in r && r.desafio === 'NOVA_SENHA';
}

/** Política de senha do User Pool: mín. 8, maiúscula, minúscula, número e símbolo. */
export const REGRA_SENHA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const DICA_SENHA =
  'Ao menos 8 caracteres, com letra maiúscula, letra minúscula, número e símbolo.';


export interface RespostaCadastro {
  mensagem: string;
}


export interface AtualizacaoUsuario {
  nome?: string;
  status?: StatusUsuario;
  cursoId?: string;
}

/**
 * Corpo de POST /admin/usuarios — cadastro de orientador/admin feito pelo
 * administrador. Nunca é ALUNO aqui: aluno só se cadastra pelo próprio
 * self sign-up.
 */
export interface NovaConta {
  nome: string;
  email: string;
  perfil: 'ORIENTADOR' | 'ADMIN';
}

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ALUNO: 'Aluno',
  ORIENTADOR: 'Orientador',
  ADMIN: 'Admin',
};


export function ehEquipeAcademica(perfil: Perfil | null): boolean {
  return perfil === 'ORIENTADOR' || perfil === 'ADMIN';
}

/**
 * RGM do aluno: o e-mail de aluno é sempre `<rgm>@alunos.umc.br` (garantido
 * pelo Pre Sign-up no Cognito), a mesma regra do backend (`actor.RGM`).
 */
export function rgmDoUsuario(usuario: Usuario | null): string {
  if (!usuario) {
    return '';
  }
  if (usuario.rgm) {
    return usuario.rgm;
  }
  if (usuario.perfil !== 'ALUNO') {
    return '';
  }
  return usuario.email.split('@')[0] ?? '';
}
