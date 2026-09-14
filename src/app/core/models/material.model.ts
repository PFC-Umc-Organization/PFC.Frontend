export type TipoMaterial = 'DOCUMENTO' | 'MODELO' | 'VIDEO' | 'LINK';

export interface Material {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoMaterial;
  url: string;
  cursoId: string | null;
  publicadoEm: string;
}

export interface NovoMaterial {
  titulo: string;
  descricao: string;
  tipo: TipoMaterial;
  url: string;
  cursoId: string | null;
}

export const ROTULO_TIPO_MATERIAL: Record<TipoMaterial, string> = {
  DOCUMENTO: 'Documento',
  MODELO: 'Modelo',
  VIDEO: 'Vídeo',
  LINK: 'Link',
};
