import { Activity, SubmissionStatus } from '../models';
import { cellStates, editedLater, submissionStatus, submittedFileName } from './submission-status';

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

describe('editedLater', () => {
  it('ignores an edit in the same minute as the submission', () => {
    expect(editedLater({ entregueEm: '2026-10-23T17:47:02Z', atualizadaEm: '2026-10-23T17:47:40Z' })).toBe(false);
  });

  it('shows a later edit', () => {
    expect(editedLater({ entregueEm: '2026-10-23T17:47:02Z', atualizadaEm: '2026-10-23T17:52:00Z' })).toBe(true);
  });

  it('has nothing to show without an edit', () => {
    expect(editedLater({ entregueEm: '2026-10-23T17:47:02Z' })).toBe(false);
  });
});

describe('cellStates', () => {
  const cells = (...statuses: SubmissionStatus[]) => statuses.map((status) => ({ status }));

  it('marks the nearest open activity as waiting and the next ones as blocked by it', () => {
    expect(cellStates(cells('ENTREGUE', 'PENDENTE', 'PENDENTE', 'PENDENTE')).map((c) => c.state)).toEqual([
      'review',
      'waiting',
      'blocked',
      'blocked',
    ]);
    expect(cellStates(cells('ENTREGUE', 'PENDENTE', 'PENDENTE'))[2].blockedBy).toBe(1);
  });

  it('does not let an overdue activity block the ones still on time', () => {
    expect(cellStates(cells('ATRASADO', 'PENDENTE', 'PENDENTE'))).toEqual([
      { state: 'late' },
      { state: 'waiting' },
      { state: 'blocked', blockedBy: 1 },
    ]);
  });

  it('does not block anything when every earlier activity was submitted, late or not', () => {
    expect(cellStates(cells('ENTREGUE_COM_ATRASO', 'PENDENTE')).map((c) => c.state)).toEqual(['review', 'waiting']);
  });

  it('follows a delivery from review to done, or back to the group when it is returned', () => {
    expect(cellStates([{ status: 'ENTREGUE' }])[0].state).toBe('review');
    expect(cellStates([{ status: 'ENTREGUE', validation: 'VALIDADA' }])[0].state).toBe('done');
    expect(cellStates([{ status: 'ENTREGUE_COM_ATRASO', validation: 'VALIDADA' }])[0].state).toBe('done');
    expect(cellStates([{ status: 'ENTREGUE', validation: 'NAO_VALIDADA' }])[0].state).toBe('returned');
  });

  it('shows an overdue activity as waived once its penalty was forgiven', () => {
    expect(cellStates([{ status: 'ATRASADO', waived: true }, { status: 'PENDENTE' }]).map((c) => c.state)).toEqual([
      'waived',
      'waiting',
    ]);
  });
});
