import { FILE_EXTENSIONS, MAX_FILE_BYTES } from './submission.model';

// ---------------------------------------------------------------------------
// Formatos
// ---------------------------------------------------------------------------

export type FileFormat = 'GERAL' | 'DOCUMENTO' | 'SLIDES' | 'PLANILHA' | 'COMPACTADO';
export type LinkFormat = 'GERAL' | 'REPOSITORIO' | 'VIDEO';

export interface FormatOption {
  id: string;
  label: string;
}

// Arquivos
export const FILE_FORMATS: Record<FileFormat, { label: string; extensions: readonly string[] }> = {
  GERAL: { label: 'Qualquer arquivo permitido (padrão)', extensions: FILE_EXTENSIONS },
  DOCUMENTO: { label: 'Documento / Monografia (PDF, Word)', extensions: ['.pdf', '.doc', '.docx', '.odt'] },
  SLIDES: { label: 'Apresentação de slides (PPTX, PDF)', extensions: ['.pptx', '.odp', '.pdf'] },
  PLANILHA: { label: 'Planilha (XLSX, CSV)', extensions: ['.xlsx', '.csv'] },
  COMPACTADO: { label: 'Arquivo compactado (ZIP, RAR)', extensions: ['.zip', '.rar'] },
};

// Links
export const LINK_FORMATS: Record<LinkFormat, { label: string; placeholder: string; hint: string; hosts: readonly string[] }> = {
  GERAL: { label: 'Link web geral', placeholder: 'https://', hint: 'Informe um endereço que comece com https://', hosts: [] },
  REPOSITORIO: {
    label: 'Repositório de código (GitHub, GitLab)',
    placeholder: 'https://github.com/usuario/repositorio',
    hint: 'Link do repositório no GitHub, GitLab ou Bitbucket, no formato dominio/usuario/repositorio.',
    hosts: ['github.com', 'gitlab.com', 'bitbucket.org'],
  },
  VIDEO: {
    label: 'Vídeo demonstrativo (YouTube, Drive)',
    placeholder: 'https://www.youtube.com/watch?v=…',
    hint: 'Link de um vídeo no YouTube ou no Google Drive.',
    hosts: ['youtube.com', 'youtu.be', 'drive.google.com'],
  },
};

// Opções
export const fileFormatOptions: FormatOption[] = Object.entries(FILE_FORMATS).map(([id, f]) => ({ id, label: f.label }));
export const linkFormatOptions: FormatOption[] = Object.entries(LINK_FORMATS).map(([id, f]) => ({ id, label: f.label }));

// Rótulo
export function formatLabel(type: string, format: string | undefined): string {
  if (!format || format === 'GERAL') {
    return '';
  }
  if (type === 'ARQUIVO') {
    return FILE_FORMATS[format as FileFormat]?.label ?? '';
  }
  return type === 'LINK' ? (LINK_FORMATS[format as LinkFormat]?.label ?? '') : '';
}

// ---------------------------------------------------------------------------
// Arquivos
// ---------------------------------------------------------------------------

// Extensões
export function extensionsOf(format: string | undefined): readonly string[] {
  return FILE_FORMATS[(format ?? 'GERAL') as FileFormat]?.extensions ?? FILE_EXTENSIONS;
}

// Texto
export function fileHintOf(format: string | undefined): string {
  if (!format || format === 'GERAL' || !(format in FILE_FORMATS)) {
    return 'PDF, Office/LibreOffice, imagem, ZIP ou texto, até 50 MB.';
  }
  const names = extensionsOf(format).map((e) => e.slice(1).toUpperCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} ou ${names.at(-1)}` : names[0];
  return `Apenas ${list}, até ${MAX_FILE_BYTES / 1024 / 1024} MB`;
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

const SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'ow.ly', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 'lnkd.in', 'bl.ink',
];

// Domínio
const onHost = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);

// Validação
export function linkProblem(value: string, format: string | undefined): string {
  const text = value.trim();
  if (!text) {
    return '';
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return 'Informe um endereço válido, começando com https://';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return 'O endereço precisa começar com http:// ou https://';
  }
  const host = url.hostname.toLowerCase();
  if (!host.includes('.')) {
    return 'Informe um endereço válido, começando com https://';
  }
  if (SHORTENERS.some((s) => onHost(host, s))) {
    return 'Links encurtados não são aceitos. Informe o endereço completo.';
  }
  const rules = LINK_FORMATS[(format ?? 'GERAL') as LinkFormat];
  if (!rules || rules.hosts.length === 0) {
    return '';
  }
  if (!rules.hosts.some((h) => onHost(host, h))) {
    return `O endereço não é de um destino aceito. ${rules.hint}`;
  }
  if (format === 'REPOSITORIO' && url.pathname.split('/').filter(Boolean).length < 2) {
    return 'Informe o link completo do repositório, no formato dominio/usuario/repositorio.';
  }
  return '';
}
