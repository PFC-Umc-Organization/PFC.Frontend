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
