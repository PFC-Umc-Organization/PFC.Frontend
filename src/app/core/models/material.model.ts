// ---------------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------------

export type MaterialKind = 'DOCUMENTO' | 'MODELO' | 'VIDEO' | 'LINK';

export interface Material {
  id: string;
  titulo: string;
  descricao: string;
  tipo: MaterialKind;
  url?: string;
  arquivo?: string;
  cursoId: string | null;
  publicadoEm: string;
  publicadoPor: string;
  autorId: string;
}

// Criação
export interface NewMaterial {
  titulo: string;
  descricao: string;
  tipo: MaterialKind;
  url?: string;
  arquivo?: string;
  cursoId: string | null;
}

export const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = {
  DOCUMENTO: 'Documento',
  MODELO: 'Modelo',
  VIDEO: 'Vídeo',
  LINK: 'Link',
};
