export type TipoMaterial = 'DOCUMENTO' | 'MODELO' | 'VIDEO' | 'LINK';

/**
 * Material de apoio publicado pelo professor e consultado pelo aluno.
 *
 * NOTA: esta tela não existe no protótipo do Lovable — foi acrescentada
 * porque "consultar os materiais de apoio" está no escopo do TCC. Se o grupo
 * preferir, é só remover a rota /materiais e este model.
 */
export interface Material {
  id: string;
  titulo: string;
  descricao: string;
  tipo: TipoMaterial;
  url: string;
  /** Null quando o material vale para todos os cursos. */
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
