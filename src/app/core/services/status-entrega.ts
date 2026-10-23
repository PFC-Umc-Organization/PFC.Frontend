import { Atividade, StatusEntrega, nomeDoArquivo } from '../models';

/** Status calculado no cliente a partir do prazo e do instante da entrega. */
export function statusDaEntrega(
  prazo: string,
  entregueEm: string | null | undefined,
  agora = new Date(),
): StatusEntrega {
  const limite = new Date(prazo);

  if (entregueEm) {
    return new Date(entregueEm) > limite ? 'ENTREGUE_COM_ATRASO' : 'ENTREGUE';
  }
  return agora > limite ? 'ATRASADO' : 'PENDENTE';
}

/** Nome do arquivo entregue: a resposta do primeiro campo ARQUIVO. */
export function arquivoDaEntrega(
  atividade: Atividade,
  respostas: Record<string, string> | undefined,
): string | undefined {
  const campo = atividade.campos.find((c) => c.tipo === 'ARQUIVO');
  const resposta = campo ? respostas?.[campo.id] : undefined;
  return resposta ? nomeDoArquivo(resposta) : undefined;
}
