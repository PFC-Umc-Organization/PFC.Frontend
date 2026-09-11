/**
 * Situação da entrega de UM projeto em UMA atividade.
 *
 * - ENTREGUE ............. entregou dentro do prazo
 * - ENTREGUE_COM_ATRASO .. entregou, mas depois do prazo (gera penalidade)
 * - PENDENTE ............. não entregou e o prazo ainda não venceu
 * - ATRASADO ............. não entregou e o prazo já venceu
 */
export type StatusEntrega =
  | 'ENTREGUE'
  | 'ENTREGUE_COM_ATRASO'
  | 'PENDENTE'
  | 'ATRASADO';

/**
 * Entrega de uma etapa por um grupo. É do projeto, não do aluno: quando um
 * integrante marca a etapa como concluída, ela passa a valer para o grupo
 * inteiro.
 */
export interface Entrega {
  id: string;
  atividadeId: string;
  projetoId: string;
  /** ISO 8601 — nulo enquanto o grupo não conclui a etapa. */
  entregueEm: string | null;
  observacao?: string;
}

/** Um quadrado da timeline do projeto. */
export interface ItemTimeline {
  atividadeId: string;
  titulo: string;
  /** Projeto a que a entrega pertence — exibido no rodapé do card. */
  projetoNome: string;
  prazo: string;
  status: StatusEntrega;
}

/**
 * Rótulo exibido no card da timeline. ATRASADO é grafado como "Penalidade por
 * atraso" porque a etapa ainda pode ser entregue — só que fora do prazo. A
 * legenda da seção usa a forma curta (ROTULO_LEGENDA).
 */
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

/** Rótulo curto usado na matriz projeto × atividade do professor. */
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

/** Linha da tabela "Status de entrega por projeto". */
export interface LinhaStatusProjeto {
  projeto: { id: string; nome: string };
  celulas: { atividadeId: string; status: StatusEntrega }[];
}
