/**
 * Situação de uma atividade na visão do professor — agregada sobre as
 * entregas de todos os projetos.
 */
export type StatusAtividade = 'CONCLUIDA' | 'EM_ANDAMENTO' | 'ATRASADA';

/**
 * Entregável do PFC.
 *
 * O cronograma é institucional: uma atividade publicada vale para TODOS os
 * projetos, de todos os cursos. Por isso não há vínculo com curso nem com
 * projeto aqui — quem varia é a entrega, que é feita por cada grupo.
 */
export interface Atividade {
  id: string;
  titulo: string;
  descricao: string;
  /** Data e hora limite de entrega (ISO 8601). */
  prazo: string;
  publicadaEm: string;
}

export interface NovaAtividade {
  titulo: string;
  descricao: string;
  prazo: string;
}

/** Edição de uma atividade já publicada. */
export interface AtualizacaoAtividade {
  titulo?: string;
  descricao?: string;
  prazo?: string;
}

/** Atividade + números agregados, como aparece na tabela do professor. */
export interface AtividadeResumo {
  atividade: Atividade;
  /** Quantos projetos já entregaram esta etapa. */
  projetosEntregues: number;
  totalProjetos: number;
  status: StatusAtividade;
}

export const ROTULO_STATUS_ATIVIDADE: Record<StatusAtividade, string> = {
  CONCLUIDA: 'Concluída',
  EM_ANDAMENTO: 'Em andamento',
  ATRASADA: 'Atrasada',
};
