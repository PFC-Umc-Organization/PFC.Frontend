/** Perfis de acesso da plataforma. */
export type Perfil = 'ALUNO' | 'PROFESSOR';

export type StatusUsuario = 'ATIVO' | 'INATIVO';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  status: StatusUsuario;
  /** Cursos em que o usuário está matriculado (alunos) ou que coordena (professores). */
  cursoIds: string[];
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

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
};
