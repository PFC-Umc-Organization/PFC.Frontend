import { Project } from './project.model';

// ---------------------------------------------------------------------------
// Entregas
// ---------------------------------------------------------------------------

export type SubmissionStatus = 'ENTREGUE' | 'ENTREGUE_COM_ATRASO' | 'PENDENTE' | 'ATRASADO';

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

export type ValidationStatus = 'VALIDADA' | 'NAO_VALIDADA';

export interface Validation {
  status: ValidationStatus;
  comentario?: string;
  por: string;
  porNome: string;
  em: string;
}

// Envio
export interface ValidationInput {
  status: ValidationStatus;
  comentario?: string;
}

// ---------------------------------------------------------------------------
// Respostas
// ---------------------------------------------------------------------------

export interface Submission {
  atividadeId: string;
  projetoId: string;
  entregueEm: string | null;
  entreguePor?: string;
  respostas?: Record<string, string>;
  atualizadaEm?: string;
  atualizadaPor?: string;
  validacao?: Validation | null;
}

export type Answers = Record<string, string>;

// ---------------------------------------------------------------------------
// Linha do tempo
// ---------------------------------------------------------------------------

export interface TimelineItem {
  activityId: string;
  title: string;
  projectName: string;
  deadline: string;
  status: SubmissionStatus;
  fileName?: string;
  validation?: Validation | null;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type StatusTone = 'success' | 'primary' | 'destructive';

// Rótulos
export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  ENTREGUE: 'Concluído',
  ENTREGUE_COM_ATRASO: 'Entregue com atraso',
  PENDENTE: 'Pendente no prazo',
  ATRASADO: 'Não entregue',
};

export const STATUS_SHORT_LABEL: Record<SubmissionStatus, string> = {
  ENTREGUE: 'Entregue',
  ENTREGUE_COM_ATRASO: 'Entregue',
  PENDENTE: 'Pendente',
  ATRASADO: 'Não entregue',
};

// Tons
export const STATUS_TONE: Record<SubmissionStatus, StatusTone> = {
  ENTREGUE: 'success',
  ENTREGUE_COM_ATRASO: 'destructive',
  PENDENTE: 'primary',
  ATRASADO: 'destructive',
};

// Legenda
export const STATUS_LEGEND: { tone: StatusTone; text: string }[] = [
  { tone: 'success', text: 'Concluído' },
  { tone: 'primary', text: 'Pendente no prazo' },
  { tone: 'destructive', text: 'Não entregue' },
];

// Painel
export interface ProjectStatusRow {
  project: Pick<Project, 'id' | 'nome' | 'orientadorId' | 'status' | 'ressalva'>;
  cells: { activityId: string; status: SubmissionStatus; validation?: ValidationStatus }[];
}

// Validação
export function validationLabel(v: Validation | null | undefined): string {
  if (!v) {
    return 'Aguardando validação do orientador';
  }
  return v.status === 'VALIDADA' ? 'Validada pelo orientador' : 'Não validada pelo orientador';
}

// ---------------------------------------------------------------------------
// Arquivos
// ---------------------------------------------------------------------------

// Limites
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
// Extensões
export const FILE_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.odt', '.ppt', '.pptx', '.odp',
  '.xls', '.xlsx', '.ods', '.zip', '.png', '.jpg', '.jpeg', '.txt',
];

// Validação
export function fileProblem(file: File, extensions: readonly string[] = FILE_EXTENSIONS): string {
  const dot = file.name.lastIndexOf('.');
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!extensions.includes(extension)) {
    return extensions === FILE_EXTENSIONS
      ? 'Tipo de arquivo não aceito. Envie PDF, documento do Office/LibreOffice, imagem, ZIP ou texto.'
      : `Tipo de arquivo não aceito neste campo. Envie um arquivo ${extensions.map((e) => e.slice(1).toUpperCase()).join(', ')}.`;
  }
  if (file.size === 0) {
    return 'O arquivo está vazio.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'O arquivo passa de 50 MB.';
  }
  return '';
}

// Armazenamento
export function isStoredFile(answer: string): boolean {
  return answer.startsWith('entregas/');
}

// Nome
export function fileNameOf(answer: string): string {
  return isStoredFile(answer) ? answer.slice(answer.lastIndexOf('/') + 1) : answer;
}

// Upload
export type UploadEvent =
  | { kind: 'progress'; percent: number }
  | { kind: 'done'; key: string };
