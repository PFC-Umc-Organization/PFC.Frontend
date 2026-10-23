export type SubmissionStatus = 'ENTREGUE' | 'ENTREGUE_COM_ATRASO' | 'PENDENTE' | 'ATRASADO';

export interface Submission {
  atividadeId: string;
  projetoId: string;
  /** The first submission; the one the deadline is checked against. */
  entregueEm: string | null;
  entreguePor?: string;
  /** Answers by field id; a file field holds the bucket key. */
  respostas?: Record<string, string>;
  atualizadaEm?: string;
  atualizadaPor?: string;
}

export type Answers = Record<string, string>;

export interface TimelineItem {
  activityId: string;
  title: string;
  projectName: string;
  deadline: string;
  status: SubmissionStatus;
  fileName?: string;
}

export type StatusTone = 'success' | 'primary' | 'destructive';

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

export const STATUS_TONE: Record<SubmissionStatus, StatusTone> = {
  ENTREGUE: 'success',
  ENTREGUE_COM_ATRASO: 'destructive',
  PENDENTE: 'primary',
  ATRASADO: 'destructive',
};

export const STATUS_LEGEND: { tone: StatusTone; text: string }[] = [
  { tone: 'success', text: 'Concluído' },
  { tone: 'primary', text: 'Pendente no prazo' },
  { tone: 'destructive', text: 'Não entregue' },
];

export interface ProjectStatusRow {
  project: { id: string; nome: string };
  cells: { activityId: string; status: SubmissionStatus }[];
}

/** Same limits as the backend's `internal/platform/storage/rules.go`. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const FILE_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.odt', '.ppt', '.pptx', '.odp',
  '.xls', '.xlsx', '.ods', '.zip', '.png', '.jpg', '.jpeg', '.txt',
];

/** What the backend would refuse, checked before uploading. */
export function fileProblem(file: File): string {
  const dot = file.name.lastIndexOf('.');
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!FILE_EXTENSIONS.includes(extension)) {
    return 'Tipo de arquivo não aceito — envie PDF, documento do Office/LibreOffice, imagem, ZIP ou texto.';
  }
  if (file.size === 0) {
    return 'O arquivo está vazio.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'O arquivo passa de 50 MB.';
  }
  return '';
}

/**
 * An uploaded file's answer is its bucket key
 * (`entregas/<project>/<activity>/<field>/<id>/<name>`); submissions from
 * before uploads existed hold just the name.
 */
export function isStoredFile(answer: string): boolean {
  return answer.startsWith('entregas/');
}

export function fileNameOf(answer: string): string {
  return isStoredFile(answer) ? answer.slice(answer.lastIndexOf('/') + 1) : answer;
}

export type UploadEvent =
  | { kind: 'progress'; percent: number }
  | { kind: 'done'; key: string };
