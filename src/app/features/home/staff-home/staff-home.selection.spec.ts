import { Cohort, Program } from '../../../core/models';
import { pickCohortId } from './staff-home.selection';

const cohort = (id: string, periodo: string): Cohort => ({ id, nome: 'Engenharia de Software', turno: 'NOITE', periodo }) as Cohort;
const program = (id: string, cursoId: string): Program => ({ id, cursoId }) as Program;

describe('pickCohortId', () => {
  const cohorts = [cohort('old', '2025.1'), cohort('now', '2026.2'), cohort('next', '2027.1')];

  it('is empty without cohorts', () => {
    expect(pickCohortId([], [], '2026.2', null)).toBe('');
  });

  it('prefers the cohort of the current term', () => {
    expect(pickCohortId(cohorts, [], '2026.2', null)).toBe('now');
  });

  it('falls back to the first cohort when none is in the term', () => {
    expect(pickCohortId(cohorts, [], '2030.1', null)).toBe('old');
  });

  it('for an advisor, only considers the cohorts whose program has a project they advise', () => {
    const programs = [program('p-old', 'old'), program('p-now', 'now')];
    expect(pickCohortId(cohorts, programs, '2026.2', new Set(['p-old']))).toBe('old');
  });

  it('for an advisor with no project, uses every cohort', () => {
    const programs = [program('p-old', 'old')];
    expect(pickCohortId(cohorts, programs, '2026.2', new Set())).toBe('now');
  });
});
