import { Atividade } from '../models';
import { arquivoDaEntrega, statusDaEntrega } from './status-entrega';

describe('statusDaEntrega', () => {
  const prazo = '2026-10-15T23:59';
  const agora = new Date('2026-10-14T12:00');

  it('pendente antes do prazo, atrasado depois', () => {
    expect(statusDaEntrega(prazo, null, agora)).toBe('PENDENTE');
    expect(statusDaEntrega(prazo, null, new Date('2026-10-16T00:00'))).toBe('ATRASADO');
  });

  it('entregue no prazo ou com atraso', () => {
    expect(statusDaEntrega(prazo, '2026-10-15T20:00', agora)).toBe('ENTREGUE');
    expect(statusDaEntrega(prazo, '2026-10-16T08:00', agora)).toBe('ENTREGUE_COM_ATRASO');
  });
});

describe('arquivoDaEntrega', () => {
  const atividade = {
    campos: [
      { id: 'c1', rotulo: 'Link', tipo: 'LINK', obrigatorio: true },
      { id: 'c2', rotulo: 'Arquivo', tipo: 'ARQUIVO', obrigatorio: true },
    ],
  } as Atividade;

  it('mostra o nome do arquivo, não a chave do bucket', () => {
    expect(arquivoDaEntrega(atividade, { c1: 'https://x', c2: 'entregas/p/a/c2/u/tcc.pdf' })).toBe('tcc.pdf');
  });

  it('sem resposta, sem nome', () => {
    expect(arquivoDaEntrega(atividade, { c1: 'https://x' })).toBeUndefined();
    expect(arquivoDaEntrega(atividade, undefined)).toBeUndefined();
  });
});
