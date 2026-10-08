export type StatusAtividade = 'CONCLUIDA' | 'EM_ANDAMENTO' | 'ATRASADA';


export type TipoCampoEntrega = 'ARQUIVO' | 'TEXTO' | 'TEXTO_LONGO' | 'LINK';

export const ROTULO_TIPO_CAMPO: Record<TipoCampoEntrega, string> = {
  ARQUIVO: 'Arquivo',
  TEXTO: 'Texto curto',
  TEXTO_LONGO: 'Texto longo',
  LINK: 'Link',
};

/** Um campo do formulário que o grupo preenche ao entregar a atividade. */
export interface CampoEntrega {
  id: string;
  rotulo: string;
  tipo: TipoCampoEntrega;
  obrigatorio: boolean;
}

export type NovoCampoEntrega = Omit<CampoEntrega, 'id'>;

/** Campo que toda atividade nasce com — ela nunca fica sem nenhum. */
export const CAMPO_ENTREGA_PADRAO: NovoCampoEntrega = {
  rotulo: 'Arquivo da entrega',
  tipo: 'ARQUIVO',
  obrigatorio: true,
};

export interface Atividade {
  id: string;
  titulo: string;
  descricao: string;
  prazo: string;
  publicadaEm: string;
  /** Formulário de entrega — sempre com ao menos um campo. */
  campos: CampoEntrega[];
}

export interface NovaAtividade {
  titulo: string;
  descricao: string;
  prazo: string;
  /** Formulário de entrega; sem ele a atividade nasce com o campo padrão. */
  campos?: NovoCampoEntrega[];
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
