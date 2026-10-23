import { Curso } from './curso.model';

export interface Projeto {
  id: string;
  nome: string;
  descricao: string;
  programaId: string;
  integrantes: string[];
  orientadorId?: string;
}

/** Projeto com os nomes já resolvidos pelo backend (`GET /projetos/:id`). */
export interface ProjetoDetalhe {
  projeto: Projeto;
  /** `nome` é null quando o RGM ainda não tem conta. */
  integrantes: { rgm: string; nome: string | null }[];
  orientador: { id: string; nome: string } | null;
  turma: Curso | null;
}

/**
 * `GET /meu-pfc`: o grupo do aluno ou, sem grupo, a turma em que ele está
 * pré-autorizado e o programa dela (sem `programaId`, a turma ainda não tem PFC).
 */
export interface MeuPfc {
  turma: Curso | null;
  programaId?: string;
  grupo: ProjetoDetalhe | null;
}

export interface NovoProjeto {
  nome: string;
  descricao: string;
  programaId: string;
  integrantes: string[];
}

/** O aluno cria o projeto do próprio grupo: ele entra sozinho como integrante. */
export interface NovoProjetoDoAluno {
  nome: string;
  descricao: string;
  /** RGMs dos colegas, que recebem convite (o criador não precisa se incluir). */
  integrantes: string[];
}

/**
 * Convite pendente pra um aluno entrar no grupo — espelha `groups.Invitation`
 * do backend. Só existe enquanto ninguém respondeu: aceitou, recusou ou foi
 * cancelado, some.
 */
export interface Convite {
  projetoId: string;
  projetoNome: string;
  /** RGM de quem foi convidado. */
  rgm: string;
  /** Nome de quem convidou. */
  convidadoPor: string;
  /** Data/hora ISO (UTC). */
  criadoEm: string;
}

export interface AtualizacaoProjeto {
  nome?: string;
  descricao?: string;
}

/** Mesmos limites de `internal/groups/domain.go` no backend. */
export const LIMITES_PROJETO = { nome: 150, descricao: 2000, integrantes: 10 } as const;

/**
 * Lê os RGMs digitados no "criar PFC" (vírgula, ponto e vírgula, espaço ou
 * quebra de linha) e confere antes de enviar: só números, sem repetir, sem o
 * próprio RGM e cabendo no grupo junto com quem cria.
 */
export function colegasDoFormulario(
  texto: string,
  meuRgm: string,
): { rgms: string[] } | { erro: string } {
  const rgms = [...new Set(texto.split(/[\s,;]+/).filter(Boolean))].filter(
    (r) => r !== meuRgm,
  );
  const invalido = rgms.find((r) => !/^\d+$/.test(r));
  if (invalido) {
    return { erro: `"${invalido}" não é um RGM válido — use só números.` };
  }
  const maxColegas = LIMITES_PROJETO.integrantes - 1;
  if (rgms.length > maxColegas) {
    return {
      erro: `O grupo pode ter até ${LIMITES_PROJETO.integrantes} pessoas contando você — informe no máximo ${maxColegas} colegas.`,
    };
  }
  return { rgms };
}
