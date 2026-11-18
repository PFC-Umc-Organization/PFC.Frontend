import { Cohort } from './cohort.model';

// ---------------------------------------------------------------------------
// Projetos
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  nome: string;
  descricao: string;
  programaId: string;
  integrantes: string[];
  orientadorId?: string;
}

// Detalhe
export interface ProjectDetail {
  projeto: Project;
  integrantes: { rgm: string; nome: string | null }[];
  orientador: { id: string; nome: string } | null;
  turma: Cohort | null;
}

// Meu PFC
export interface MyPfc {
  turma: Cohort | null;
  programaId?: string;
  grupo: ProjectDetail | null;
}

// Criação
export interface NewStudentProject {
  nome: string;
  descricao: string;
  integrantes: string[];
}

// ---------------------------------------------------------------------------
// Convites
// ---------------------------------------------------------------------------

export interface Invitation {
  projetoId: string;
  projetoNome: string;
  rgm: string;
  nome?: string;
  convidadoPor: string;
  criadoEm: string;
}

// Atualização
export interface ProjectUpdate {
  nome?: string;
  descricao?: string;
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

export const PROJECT_LIMITS = { nome: 150, descricao: 1000, integrantes: 10 } as const;

// Leitura
export function parseClassmates(
  text: string,
  ownRgm: string,
): { rgms: string[] } | { erro: string } {
  const rgms = [...new Set(text.split(/[\s,;]+/).filter(Boolean))].filter(
    (r) => r !== ownRgm,
  );
  const invalid = rgms.find((r) => !/^\d+$/.test(r));
  if (invalid) {
    return { erro: `"${invalid}" não é um RGM válido. Use só números.` };
  }
  const maxClassmates = PROJECT_LIMITS.integrantes - 1;
  if (rgms.length > maxClassmates) {
    return {
      erro: `O grupo pode ter até ${PROJECT_LIMITS.integrantes} pessoas contando você. Informe no máximo ${maxClassmates} colegas.`,
    };
  }
  return { rgms };
}
