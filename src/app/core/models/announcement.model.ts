// ---------------------------------------------------------------------------
// Avisos
// ---------------------------------------------------------------------------

export interface Announcement {
  id: string;
  titulo: string;
  conteudo: string;
  turmaId: string | null;
  publicadoEm: string;
  publicadoPor: string;
  autorId: string;
}

// Criação
export interface NewAnnouncement {
  titulo: string;
  conteudo: string;
  turmaId: string | null;
}

export const ANNOUNCEMENT_LIMITS = { titulo: 120, conteudo: 2000 } as const;
