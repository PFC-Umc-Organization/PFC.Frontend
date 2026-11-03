import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Cohort, Material, Project, ProjectPenalties } from '../core/models';
import { ActivityService } from '../core/services/activity.service';
import { AuthService } from '../core/services/auth.service';
import { CohortService } from '../core/services/cohort.service';
import { MaterialService } from '../core/services/material.service';
import { PenaltyService } from '../core/services/penalty.service';
import { ProjectService } from '../core/services/project.service';
import { SubmissionService } from '../core/services/submission.service';
import { DeliverablesComponent } from './deliverables/deliverables.component';
import { StudentHomeComponent } from './home/student-home/student-home.component';
import { MaterialsComponent } from './materials/materials.component';

const project: Project = { id: 'pr1', nome: 'Athena', descricao: '', programaId: 'p1', integrantes: ['111'] };
const penalties = { ativas: 0, limite: 3, reprovado: false, penalidades: [] } as unknown as ProjectPenalties;
const cohort = { id: 't1', nome: 'Engenharia de Software', turno: 'NOITE', periodo: '2026.2' } as Cohort;
const material = { id: 'm1', titulo: 'Modelo', descricao: '', tipo: 'LINK', url: 'https://x', cursoId: 't1' } as unknown as Material;
const failure = <T>(): Observable<T> => throwError(() => new Error('serviço fora do ar'));

function failingOnce<T>(value: T): () => Observable<T> {
  let calls = 0;
  return () => (++calls === 1 ? failure<T>() : of(value));
}

function retryButton(host: HTMLElement): HTMLButtonElement {
  return Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('Tentar novamente'))!;
}

function studentProviders(ofProject: () => Observable<ProjectPenalties>) {
  return [
    provideZonelessChangeDetection(),
    provideRouter([]),
    { provide: ProjectService, useValue: { myProject: () => of(project) } },
    { provide: PenaltyService, useValue: { ofProject } },
    { provide: ActivityService, useValue: { list: () => of([]) } },
    { provide: SubmissionService, useValue: { projectTimeline: () => of([]), ofProject: () => of([]) } },
  ];
}

describe('StudentHomeComponent load errors', () => {
  it('warns when penalties failed to load and recovers on retry', async () => {
    TestBed.configureTestingModule({ providers: studentProviders(failingOnce(penalties)) });
    const fixture = TestBed.createComponent(StudentHomeComponent);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Não foi possível carregar as penalidades do grupo. serviço fora do ar');

    retryButton(host).click();
    await fixture.whenStable();
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Penalidades');
  });

  it('shows no penalty warning when they load', async () => {
    TestBed.configureTestingModule({ providers: studentProviders(() => of(penalties)) });
    const fixture = TestBed.createComponent(StudentHomeComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Não foi possível');
  });
});

describe('DeliverablesComponent load errors', () => {
  it('warns when penalties failed to load', async () => {
    TestBed.configureTestingModule({ providers: studentProviders(failure) });
    const fixture = TestBed.createComponent(DeliverablesComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.alert')?.textContent).toContain('serviço fora do ar');
  });

  it('shows no warning when penalties load', async () => {
    TestBed.configureTestingModule({ providers: studentProviders(() => of(penalties)) });
    const fixture = TestBed.createComponent(DeliverablesComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.alert')).toBeNull();
  });
});

describe('MaterialsComponent load errors', () => {
  function configure(list: () => Observable<Cohort[]>): void {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: { role: signal('ADMIN'), user: signal({ id: 'me', perfil: 'ADMIN' }) } },
        { provide: CohortService, useValue: { list } },
        { provide: MaterialService, useValue: { list: () => of([material]) } },
      ],
    });
  }

  it('does not call a cohort removed when cohorts failed, and recovers on retry', async () => {
    configure(failingOnce([cohort]));
    const fixture = TestBed.createComponent(MaterialsComponent);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Não foi possível carregar as turmas');
    expect(host.textContent).toContain('Turma não identificada');
    expect(host.textContent).not.toContain('Turma removida');

    retryButton(host).click();
    await fixture.whenStable();
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Engenharia de Software');
  });

  it('still reports a removed cohort when cohorts loaded', async () => {
    configure(() => of([]));
    const fixture = TestBed.createComponent(MaterialsComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Turma removida');
  });
});
