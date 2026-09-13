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
  /** Registro Geral do Aluno. Só existe em contas pré-cadastradas pelo professor. */
  rgm?: string;
}

export interface NovoUsuario {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
}

/**
 * Pré-cadastro feito pelo professor: RGM, nome e a turma do aluno. O aluno
 * ainda não tem e-mail/senha próprios, mas já existe na base e pode ser
 * escolhido como integrante de um PFC — só por quem for da mesma turma.
 */
export interface NovoUsuarioProfessor {
  rgm: string;
  nome: string;
  cursoId: string;
}

export interface Credenciais {
  email: string;
  senha: string;
}

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
};
