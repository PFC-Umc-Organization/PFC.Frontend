export type MaterialKind = 'DOCUMENTO' | 'MODELO' | 'VIDEO' | 'LINK';

/**
 * A link (`url`) or an uploaded file (`arquivo` is its name, downloaded from
 * `GET /materiais/:id/arquivo`). `cursoId` is the cohort; `null` means all.
 */
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
  /** Publisher's sub: an advisor removes only their own. */
  autorId: string;
}

/** Either `url` or `arquivo` (the key returned by the upload). */
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
