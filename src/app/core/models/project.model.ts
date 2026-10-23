import { Cohort } from './cohort.model';

export interface Project {
  id: string;
  nome: string;
  descricao: string;
  programaId: string;
  integrantes: string[];
  orientadorId?: string;
}

/** `GET /projetos/:id`, with the names already resolved by the backend. */
export interface ProjectDetail {
  projeto: Project;
  /** `nome` is null while the RGM has no account. */
  integrantes: { rgm: string; nome: string | null }[];
  orientador: { id: string; nome: string } | null;
  turma: Cohort | null;
}

/**
 * `GET /meu-pfc`: the student's group or, without one, the cohort they are
 * enrolled in and its program (no `programaId`: the cohort has no PFC yet).
 */
export interface MyPfc {
  turma: Cohort | null;
  programaId?: string;
  grupo: ProjectDetail | null;
}

/** The creator joins alone; `integrantes` are the classmates to invite. */
export interface NewStudentProject {
  nome: string;
  descricao: string;
  integrantes: string[];
}

/** A pending invitation; it disappears once accepted, declined or cancelled. */
export interface Invitation {
  projetoId: string;
  projetoNome: string;
  rgm: string;
  /** The guest's name, only in the group's list and once they have an account. */
  nome?: string;
  convidadoPor: string;
  criadoEm: string;
}

export interface ProjectUpdate {
  nome?: string;
  descricao?: string;
}

/** Same limits as the backend's `internal/groups/domain.go`. */
export const PROJECT_LIMITS = { nome: 150, descricao: 2000, integrantes: 10 } as const;

/**
 * Reads the RGMs typed when creating a PFC (separated by comma, semicolon,
 * space or line break): digits only, no repeats, without the creator's own
 * and fitting in the group together with them.
 */
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
