export type StatusAtividade = 'CONCLUIDA' | 'EM_ANDAMENTO' | 'ATRASADA';


export interface Atividade {
  id: string;
  titulo: string;
  descricao: string;
  prazo: string;
  publicadaEm: string;
}

export interface NovaAtividade {
  titulo: string;
  descricao: string;
  prazo: string;
}


export interface AtualizacaoAtividade {
  titulo?: string;
  descricao?: string;
  prazo?: string;
}


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
