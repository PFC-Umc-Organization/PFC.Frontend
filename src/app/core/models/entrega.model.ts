export type StatusEntrega =
  | 'ENTREGUE'
  | 'ENTREGUE_COM_ATRASO'
  | 'PENDENTE'
  | 'ATRASADO';

export interface Entrega {
  id: string;
  atividadeId: string;
  projetoId: string;
  /** ISO 8601 — nulo enquanto o grupo não conclui a etapa. */
  entregueEm: string | null;
  /** Nome do arquivo anexado pelo grupo. */
  arquivoNome?: string;
  observacao?: string;
}


export interface ItemTimeline {
  atividadeId: string;
  titulo: string;
  projetoNome: string;
  prazo: string;
  status: StatusEntrega;
  arquivoNome?: string;
}


export const ROTULO_STATUS_ENTREGA: Record<StatusEntrega, string> = {
  ENTREGUE: 'Concluído',
  ENTREGUE_COM_ATRASO: 'Entregue com atraso',
  PENDENTE: 'Pendente no prazo',
  ATRASADO: 'Penalidade por atraso',
};

export const ROTULO_LEGENDA: { tom: TomStatus; texto: string }[] = [
  { tom: 'success', texto: 'Concluído' },
  { tom: 'primary', texto: 'Pendente no prazo' },
  { tom: 'destructive', texto: 'Atrasado' },
];

export const ROTULO_STATUS_ENTREGA_CURTO: Record<StatusEntrega, string> = {
  ENTREGUE: 'Entregue',
  ENTREGUE_COM_ATRASO: 'Entregue',
  PENDENTE: 'Pendente',
  ATRASADO: 'Atrasado',
};

export type TomStatus = 'success' | 'primary' | 'destructive';

export const TOM_STATUS_ENTREGA: Record<StatusEntrega, TomStatus> = {
  ENTREGUE: 'success',
  ENTREGUE_COM_ATRASO: 'destructive',
  PENDENTE: 'primary',
  ATRASADO: 'destructive',
};

export interface LinhaStatusProjeto {
  projeto: { id: string; nome: string };
  celulas: { atividadeId: string; status: StatusEntrega }[];
}
