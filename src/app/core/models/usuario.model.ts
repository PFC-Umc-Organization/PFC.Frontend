export type Perfil = 'ALUNO' | 'PROFESSOR' | 'COORDENADOR';

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
   * confirmado (a pessoa ainda não consegue entrar). Ausente no mock.
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


export interface RespostaCadastro {
  mensagem: string;
}


export interface AtualizacaoUsuario {
  nome?: string;
  status?: StatusUsuario;
  cursoId?: string;
}

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
  COORDENADOR: 'Coordenador',
};


export function ehEquipeAcademica(perfil: Perfil | null): boolean {
  return perfil === 'PROFESSOR' || perfil === 'COORDENADOR';
}

/**
 * RGM do aluno. O login real (`POST /auth/login`) ainda não devolve `rgm`,
 * mas o e-mail de aluno é sempre `<rgm>@alunos.umc.br` — garantido pelo Pre
 * Sign-up no Cognito —, então a parte local do e-mail é o RGM. É a mesma
 * regra que o backend usa (`common.RGMDaRequisicao`).
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
