// ---------------------------------------------------------------------------
// Penalidades
// ---------------------------------------------------------------------------

export type PenaltySource = 'PRAZO' | 'MANUAL';

// Perdão
export interface Waiver {
  motivo: string;
  por: string;
  em: string;
}

export interface Penalty {
  id: string;
  origem: PenaltySource;
  atividadeId?: string;
  atividadeTitulo?: string;
  motivo?: string;
  aplicadaEm: string;
  aplicadaPor?: string;
  perdao: Waiver | null;
}

// Resumo
export interface ProjectPenalties {
  projetoId: string;
  ativas: number;
  limite: number;
  reprovado: boolean;
  penalidades: Penalty[];
}

// Criação
export interface NewPenalty {
  motivo: string;
  atividadeId?: string;
}

// Título
export function penaltyTitle(p: Penalty): string {
  return p.origem === 'PRAZO' ? (p.atividadeTitulo ?? 'Atividade removida') : (p.motivo ?? '');
}
