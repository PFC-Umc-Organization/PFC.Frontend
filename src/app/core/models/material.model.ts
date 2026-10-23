export type TipoMaterial = 'DOCUMENTO' | 'MODELO' | 'VIDEO' | 'LINK';

/**
 * Material de apoio: um link (`url`) ou um arquivo enviado (`arquivo` é o
 * nome; baixa por `GET /materiais/:id/arquivo`). `cursoId` é a turma; `null`
 * vale para todas.
 */
export interface Material {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoMaterial;
  url?: string;
  arquivo?: string;
  cursoId: string | null;
  publicadoEm: string;
  publicadoPor: string;
  /** Sub de quem publicou: o orientador só remove os próprios. */
  autorId: string;
}

/** `arquivo` é a chave devolvida pelo envio; informe ele ou `url`. */
export interface NovoMaterial {
  titulo: string;
  descricao: string;
  tipo: TipoMaterial;
  url?: string;
  arquivo?: string;
  cursoId: string | null;
}

export const ROTULO_TIPO_MATERIAL: Record<TipoMaterial, string> = {
  DOCUMENTO: 'Documento',
  MODELO: 'Modelo',
  VIDEO: 'Vídeo',
  LINK: 'Link',
};
