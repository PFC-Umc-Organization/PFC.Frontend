export type FieldType = 'ARQUIVO' | 'TEXTO' | 'TEXTO_LONGO' | 'LINK';

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  ARQUIVO: 'Arquivo',
  TEXTO: 'Texto curto',
  TEXTO_LONGO: 'Texto longo',
  LINK: 'Link',
};

/** One field of the form a group fills in to submit an activity. */
export interface Field {
  id: string;
  rotulo: string;
  tipo: FieldType;
  obrigatorio: boolean;
}

export type NewField = Omit<Field, 'id'>;

export const DEFAULT_FIELD: NewField = {
  rotulo: 'Arquivo da entrega',
  tipo: 'ARQUIVO',
  obrigatorio: true,
};

export interface Activity {
  id: string;
  titulo: string;
  descricao: string;
  prazo: string;
  publicadaEm: string;
  /** Never empty. */
  campos: Field[];
}

export interface NewActivity {
  titulo: string;
  descricao: string;
  prazo: string;
  /** Without it the activity gets the default field. */
  campos?: NewField[];
}

export interface ActivityUpdate {
  titulo?: string;
  descricao?: string;
  prazo?: string;
}
