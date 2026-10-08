import { Atividade, Entrega, StatusAtividade, StatusEntrega } from '../models';

/**
 * Regras de status calculadas no cliente a partir do prazo e do instante da
 * entrega (mesmas do `MemoriaStore`, que continua servindo o modo mock).
 */
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

/** Status da atividade olhando todos os projetos considerados. */
export function statusDaAtividade(
  atividade: Atividade,
  projetoIds: string[],
  entregas: Pick<Entrega, 'projetoId' | 'entregueEm'>[],
  agora = new Date(),
): StatusAtividade {
  if (projetoIds.length === 0) {
    return agora > new Date(atividade.prazo) ? 'ATRASADA' : 'EM_ANDAMENTO';
  }

  const statuses = projetoIds.map((id) =>
    statusDaEntrega(
      atividade.prazo,
      entregas.find((e) => e.projetoId === id)?.entregueEm,
      agora,
    ),
  );

  if (statuses.every((s) => s === 'ENTREGUE' || s === 'ENTREGUE_COM_ATRASO')) {
    return 'CONCLUIDA';
  }
  return statuses.includes('ATRASADO') ? 'ATRASADA' : 'EM_ANDAMENTO';
}

/** Nome do arquivo entregue: a resposta do primeiro campo ARQUIVO. */
export function arquivoDaEntrega(
  atividade: Atividade,
  respostas: Record<string, string> | undefined,
): string | undefined {
  const campo = atividade.campos.find((c) => c.tipo === 'ARQUIVO');
  return campo ? respostas?.[campo.id] : undefined;
}
