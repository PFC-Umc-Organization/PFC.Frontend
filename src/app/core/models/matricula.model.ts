import { StatusUsuario } from './usuario.model';

/**
 * Pré-autorização de um RGM, feita em lote pelo coordenador — espelha
 * `matricula.RGMRequest`/o registro `STUDENT#<rgm>` do backend.
 *
 * Isso NÃO é uma conta: é só uma allowlist. O aluno só vira um `Usuario` de
 * verdade quando ele mesmo se cadastra (e-mail/senha) e o Cognito confere o
 * RGM contra essa lista — por isso não tem nome nem e-mail aqui.
 */
export interface Matricula {
  rgm: string;
  status: StatusUsuario;
}

/** Uma falha de processamento de um RGM específico dentro de um lote. */
export interface FalhaMatricula {
  rgm: string;
  erro: string;
}

/** Resposta de POST/DELETE /admin/students — sucesso parcial é esperado. */
export interface ResultadoMatricula {
  processados: number;
  falhas: FalhaMatricula[];
}
