import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { Project } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ReferenceService } from '../../core/services/reference.service';
import { ReferencesComponent } from './references.component';

const project: Project = { id: 'pr1', nome: 'Athena', descricao: '', programaId: 'p1', integrantes: ['111'] };
const failure = <T>(): Observable<T> => throwError(() => new Error('serviço fora do ar'));

/** Fails on the first call and answers normally on the retry. */
function failingOnce<T>(value: T): () => Observable<T> {
  let calls = 0;
  return () => (++calls === 1 ? failure<T>() : of(value));
}

async function render(role: 'ALUNO' | 'ADMIN', projects: Partial<ProjectService>) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AuthService, useValue: { role: signal(role) } },
      { provide: ProjectService, useValue: projects },
      { provide: ReferenceService, useValue: { ofProject: () => of([]) } },
    ],
  });
  const fixture = TestBed.createComponent(ReferencesComponent);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const retry = async () => {
    Array.from(host.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Tentar novamente'))!
      .click();
    await fixture.whenStable();
  };
  return { host, retry };
}

describe('ReferencesComponent load errors', () => {
  it('does not tell a student they have no PFC when loading failed, and recovers on retry', async () => {
    const { host, retry } = await render('ALUNO', { myProject: failingOnce<Project | null>(project) });
    expect(host.textContent).toContain('Não foi possível carregar o seu PFC. serviço fora do ar');
    expect(host.textContent).not.toContain('Você ainda não participa de um PFC');

    await retry();
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Athena');
  });

  it('still tells a student without a group that they have no PFC', async () => {
    const { host } = await render('ALUNO', { myProject: () => of(null) });
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Você ainda não participa de um PFC');
  });

  it('does not tell the staff there are no PFCs when loading failed, and recovers on retry', async () => {
    const { host, retry } = await render('ADMIN', { list: failingOnce([project]) });
    expect(host.textContent).toContain('Não foi possível carregar os PFCs. serviço fora do ar');
    expect(host.textContent).not.toContain('Nenhum PFC cadastrado');

    await retry();
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Athena');
  });

  it('still tells the staff when there really are no PFCs', async () => {
    const { host } = await render('ADMIN', { list: () => of([]) });
    expect(host.querySelector('.alert')).toBeNull();
    expect(host.textContent).toContain('Nenhum PFC cadastrado');
  });
});
