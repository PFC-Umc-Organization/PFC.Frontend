export type StatusEntrega =
  | 'ENTREGUE'
  | 'ENTREGUE_COM_ATRASO'
  | 'PENDENTE'
  | 'ATRASADO';

export interface Entrega {
  id: string;
  atividadeId: string;
  projetoId: string;
  /** ISO 8601 — nulo enquanto o grupo não conclui a etapa. */
  entregueEm: string | null;
  /** Nome do arquivo anexado pelo grupo. */
  arquivoNome?: string;
  observacao?: string;
  /** Resposta de cada campo do formulário da atividade, por id do campo. */
  respostas?: Record<string, string>;
  /** Nome de quem enviou (vem do backend). */
  entreguePor?: string;
}

/** Respostas do formulário de entrega, por id do campo (arquivo = chave no bucket). */
export type RespostasEntrega = Record<string, string>;


export interface ItemTimeline {
  atividadeId: string;
  titulo: string;
  projetoNome: string;
  prazo: string;
  status: StatusEntrega;
  arquivoNome?: string;
}


export const ROTULO_STATUS_ENTREGA: Record<StatusEntrega, string> = {
  ENTREGUE: 'Concluído',
  ENTREGUE_COM_ATRASO: 'Entregue com atraso',
  PENDENTE: 'Pendente no prazo',
  ATRASADO: 'Penalidade por atraso',
};

export const ROTULO_LEGENDA: { tom: TomStatus; texto: string }[] = [
  { tom: 'success', texto: 'Concluído' },
  { tom: 'primary', texto: 'Pendente no prazo' },
  { tom: 'destructive', texto: 'Atrasado' },
];

export const ROTULO_STATUS_ENTREGA_CURTO: Record<StatusEntrega, string> = {
  ENTREGUE: 'Entregue',
  ENTREGUE_COM_ATRASO: 'Entregue',
  PENDENTE: 'Pendente',
  ATRASADO: 'Atrasado',
};

export type TomStatus = 'success' | 'primary' | 'destructive';

export const TOM_STATUS_ENTREGA: Record<StatusEntrega, TomStatus> = {
  ENTREGUE: 'success',
  ENTREGUE_COM_ATRASO: 'destructive',
  PENDENTE: 'primary',
  ATRASADO: 'destructive',
};

export interface LinhaStatusProjeto {
  projeto: { id: string; nome: string };
  celulas: { atividadeId: string; status: StatusEntrega }[];
}

/** Mesmos limites de `internal/deliveries/files.go` no backend. */
export const TAMANHO_MAXIMO_ARQUIVO = 50 * 1024 * 1024;
export const EXTENSOES_ARQUIVO = [
  '.pdf', '.doc', '.docx', '.odt', '.ppt', '.pptx', '.odp',
  '.xls', '.xlsx', '.ods', '.zip', '.png', '.jpg', '.jpeg', '.txt',
];

/** Confere antes do upload o que o backend recusaria. */
export function problemaDoArquivo(arquivo: File): string {
  const ponto = arquivo.name.lastIndexOf('.');
  const extensao = ponto >= 0 ? arquivo.name.slice(ponto).toLowerCase() : '';
  if (!EXTENSOES_ARQUIVO.includes(extensao)) {
    return 'Tipo de arquivo não aceito — envie PDF, documento do Office/LibreOffice, imagem, ZIP ou texto.';
  }
  if (arquivo.size === 0) {
    return 'O arquivo está vazio.';
  }
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
    return 'O arquivo passa de 50 MB.';
  }
  return '';
}

/**
 * Arquivo enviado: a resposta guarda a chave no bucket
 * (`entregas/<projeto>/<atividade>/<campo>/<id>/<nome>`). Entregas de antes
 * do upload guardam só o nome.
 */
export function ehArquivoGuardado(resposta: string): boolean {
  return resposta.startsWith('entregas/');
}

export function nomeDoArquivo(resposta: string): string {
  return ehArquivoGuardado(resposta)
    ? resposta.slice(resposta.lastIndexOf('/') + 1)
    : resposta;
}

export type EnvioArquivo =
  | { tipo: 'progresso'; percentual: number }
  | { tipo: 'pronto'; chave: string };
