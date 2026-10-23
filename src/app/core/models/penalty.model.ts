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

export function penaltyTitle(p: Penalty): string {
  if (p.origem === 'PRAZO') {
    return `Prazo perdido: ${p.atividadeTitulo ?? 'atividade'}`;
  }
  return p.atividadeTitulo ? `${p.motivo} (${p.atividadeTitulo})` : (p.motivo ?? '');
}
