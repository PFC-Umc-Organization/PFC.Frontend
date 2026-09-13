/**
 * Perfis de acesso da plataforma — espelha `auth.Perfil` do backend.
 * `COORDENADOR` é um perfil de verdade (vem do atributo customizado
 * `custom:perfil` no Cognito), não uma flag em cima de `PROFESSOR`.
 */
export type Perfil = 'ALUNO' | 'PROFESSOR' | 'COORDENADOR';

export type StatusUsuario = 'ATIVO' | 'INATIVO';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  status: StatusUsuario;
  /** Cursos em que o usuário está matriculado (alunos) ou que coordena (professores). */
  cursoIds: string[];
  /**
   * Registro Geral do Aluno. Só existe depois que o próprio aluno se
   * cadastra (o RGM vem embutido no e-mail e é conferido contra a
   * pré-autorização em `Matricula` no momento do signup no Cognito).
   */
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

/** Resposta de POST /auth/login — o `token` é o IdToken emitido pelo Cognito. */
export interface RespostaAutenticacao {
  usuario: Usuario;
  token: string;
}

/**
 * Resposta de POST /auth/registrar. Sem token: o Cognito pode exigir
 * confirmação por e-mail antes do primeiro login.
 */
export interface RespostaCadastro {
  mensagem: string;
}

/**
 * Edição feita pelo professor na tela de Usuários. `cursoId` (a turma) só
 * faz sentido para um aluno — o professor está em todas.
 */
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

/**
 * Professor e coordenador enxergam a mesma área administrativa (Gestão de
 * PFC, Atividades, Usuários) — só a gestão de orientador é exclusiva do
 * coordenador, checada à parte com `perfil === 'COORDENADOR'`.
 */
export function ehEquipeAcademica(perfil: Perfil | null): boolean {
  return perfil === 'PROFESSOR' || perfil === 'COORDENADOR';
}
