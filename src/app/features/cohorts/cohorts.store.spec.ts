import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Cohort, Course } from '../../core/models';
import { CohortService } from '../../core/services/cohort.service';
import { CourseService } from '../../core/services/course.service';
import { ProgramService } from '../../core/services/program.service';
import { ProjectService } from '../../core/services/project.service';
import { PfcManagementStore } from '../pfc-management/pfc-management.store';
import { CohortsStore, belongsTo } from './cohorts.store';

const course = (id: string, nome: string): Course => ({ id, nome }) as Course;
const cohort = (id: string, nome: string, periodo: string, graduacaoId?: string): Cohort =>
  ({ id, nome, turno: 'NOITE', periodo, graduacaoId }) as Cohort;

describe('belongsTo', () => {
  it('matches by course id when the cohort has one, ignoring the name', () => {
    expect(belongsTo(cohort('t', 'Nome antigo', '2026.1', 'c1'), course('c1', 'Novo nome'))).toBe(true);
    expect(belongsTo(cohort('t', 'Mesmo nome', '2026.1', 'c2'), course('c1', 'Mesmo nome'))).toBe(false);
  });

  it('matches by name for cohorts from before the course registry', () => {
    expect(belongsTo(cohort('t', 'Direito', '2026.1'), course('c1', 'Direito'))).toBe(true);
    expect(belongsTo(cohort('t', 'Direito', '2026.1'), course('c1', 'Outro'))).toBe(false);
  });
});

describe('CohortsStore.groups', () => {
  const cohorts = [cohort('a', 'ES', '2026.1', 'c1'), cohort('b', 'ES', '2026.2', 'c1'), cohort('x', 'Curso removido', '2025.1')];
  const programs = signal([{ id: 'p1', cursoId: 'b' }]);

  function make(projects: { programaId: string }[]) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        CohortsStore,
        { provide: CourseService, useValue: { list: () => of([course('c1', 'ES')]) } },
        { provide: CohortService, useValue: { list: () => of(cohorts) } },
        { provide: ProgramService, useValue: {} },
        { provide: ProjectService, useValue: { list: () => of(projects) } },
        { provide: PfcManagementStore, useValue: { programs: { value: programs }, loadError: signal(''), retryLoad() {}, reloadPrograms() {} } },
      ],
    });
    const store = TestBed.inject(CohortsStore);
    TestBed.tick();
    return store;
  }

  it('groups cohorts by course, newest term first, and leaves the rest loose', () => {
    const { groups, loose } = make([]).groups();
    expect(groups).toHaveLength(1);
    expect(groups[0].rows.map((r) => r.cohort.id)).toEqual(['b', 'a']);
    expect(loose.map((r) => r.cohort.id)).toEqual(['x']);
  });

  it('links each row to its program and counts its projects', () => {
    const store = make([{ programaId: 'p1' }, { programaId: 'p1' }, { programaId: 'other' }]);
    const [b, a] = store.groups().groups[0].rows;
    expect(b).toMatchObject({ programId: 'p1', projects: 2 });
    expect(a).toMatchObject({ programId: null, projects: 0 });
    expect(store.withProgram()).toBe(1);
    expect(store.freeCohorts().map((c) => c.id)).toEqual(['a', 'x']);
  });

  it('lists programs whose cohort is gone as orphans', () => {
    programs.set([{ id: 'p1', cursoId: 'b' }, { id: 'p2', cursoId: 'gone' }]);
    const store = make([{ programaId: 'p2' }]);
    expect(store.orphans()).toEqual([{ programId: 'p2', projects: 1 }]);
    programs.set([{ id: 'p1', cursoId: 'b' }]);
  });
});
