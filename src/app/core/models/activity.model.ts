// ---------------------------------------------------------------------------
// Campos
// ---------------------------------------------------------------------------

export type FieldType = 'ARQUIVO' | 'TEXTO' | 'TEXTO_LONGO' | 'LINK';

// Rótulos
export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  ARQUIVO: 'Arquivo',
  TEXTO: 'Texto curto',
  TEXTO_LONGO: 'Texto longo',
  LINK: 'Link',
};

export interface Field {
  id: string;
  rotulo: string;
  tipo: FieldType;
  obrigatorio: boolean;
}

export type NewField = Omit<Field, 'id'>;

// Padrão
export const DEFAULT_FIELD: NewField = {
  rotulo: 'Arquivo da entrega',
  tipo: 'ARQUIVO',
  obrigatorio: true,
};

// ---------------------------------------------------------------------------
// Atividades
// ---------------------------------------------------------------------------

export interface Activity {
  id: string;
  titulo: string;
  descricao: string;
  prazo: string;
  publicadaEm: string;
  campos: Field[];
  turmaId?: string;
}

// Criação
export interface NewActivity {
  titulo: string;
  descricao: string;
  prazo: string;
  campos?: NewField[];
  turmaId?: string;
}

// Atualização
export interface ActivityUpdate {
  titulo?: string;
  descricao?: string;
  prazo?: string;
}
