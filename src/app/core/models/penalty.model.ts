export type PenaltySource = 'PRAZO' | 'MANUAL';

export interface Waiver {
  motivo: string;
  por: string;
  em: string;
}

/** Active while `perdao` is null. A PRAZO penalty is an activity closed without the group's submission. */
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

/** With `limite` active penalties the group is failed and can no longer submit. */
export interface ProjectPenalties {
  projetoId: string;
  ativas: number;
  limite: number;
  reprovado: boolean;
  penalidades: Penalty[];
}

export interface NewPenalty {
  motivo: string;
  atividadeId?: string;
}

/** The activity for a missed deadline, the reason for a manual one. */
export function penaltyTitle(p: Penalty): string {
  return p.origem === 'PRAZO' ? (p.atividadeTitulo ?? 'Atividade removida') : (p.motivo ?? '');
}
