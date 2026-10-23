import { Activity } from '../models';
import { submissionStatus, submittedFileName } from './submission-status';

describe('submissionStatus', () => {
  const deadline = '2026-10-15T23:59';
  const now = new Date('2026-10-14T12:00');

  it('is pending before the deadline and late after it', () => {
    expect(submissionStatus(deadline, null, now)).toBe('PENDENTE');
    expect(submissionStatus(deadline, null, new Date('2026-10-16T00:00'))).toBe('ATRASADO');
  });

  it('is submitted on time or late', () => {
    expect(submissionStatus(deadline, '2026-10-15T20:00', now)).toBe('ENTREGUE');
    expect(submissionStatus(deadline, '2026-10-16T08:00', now)).toBe('ENTREGUE_COM_ATRASO');
  });
});

describe('submittedFileName', () => {
  const activity = {
    campos: [
      { id: 'c1', rotulo: 'Link', tipo: 'LINK', obrigatorio: true },
      { id: 'c2', rotulo: 'Arquivo', tipo: 'ARQUIVO', obrigatorio: true },
    ],
  } as Activity;

  it('shows the file name, not the bucket key', () => {
    expect(submittedFileName(activity, { c1: 'https://x', c2: 'entregas/p/a/c2/u/tcc.pdf' })).toBe('tcc.pdf');
  });

  it('has no name without an answer', () => {
    expect(submittedFileName(activity, { c1: 'https://x' })).toBeUndefined();
    expect(submittedFileName(activity, undefined)).toBeUndefined();
  });
});
