// ---------------------------------------------------------------------------
// Avisos
// ---------------------------------------------------------------------------

// Same names as the backend's JSON (internal/announcements/domain.go): a
// general announcement comes without turmaId.
export interface Announcement {
  id: string;
  titulo: string;
  conteudo: string;
  turmaId?: string | null;
  criadoEm: string;
  autorNome: string;
  autorPapel?: string;
  autorId: string;
}

// Criação
export interface NewAnnouncement {
  titulo: string;
  conteudo: string;
  turmaId: string | null;
}

export const ANNOUNCEMENT_LIMITS = { titulo: 120, conteudo: 2000 } as const;
