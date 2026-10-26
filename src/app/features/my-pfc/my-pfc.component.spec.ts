import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { MyPfc } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { InvitationService } from '../../core/services/invitation.service';
import { ProjectService } from '../../core/services/project.service';
import { MyPfcComponent } from './my-pfc.component';

const cohort = { id: 't1', nome: 'Engenharia de Software', turno: 'NOITE' as const, periodo: '2026.2' };

async function render(myPfc: Observable<MyPfc>): Promise<string> {
  TestBed.configureTestingModule({
    imports: [MyPfcComponent],
    providers: [
      provideZonelessChangeDetection(),
      { provide: ProjectService, useValue: { myPfc: () => myPfc } },
      { provide: InvitationService, useValue: { mine: () => of([]), ofProject: () => of([]) } },
      { provide: AuthService, useValue: { user: signal({ perfil: 'ALUNO', email: '111@alunos.umc.br', rgm: '111' }) } },
    ],
  });
  const fixture = TestBed.createComponent(MyPfcComponent);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('MyPfcComponent', () => {
  it('shows the group with names, cohort, advisor and who has no account yet', async () => {
    const text = await render(
      of({
        turma: cohort,
        programaId: 'p1',
        grupo: {
          projeto: { id: 'pr1', nome: 'Athena', descricao: 'Portal', programaId: 'p1', integrantes: ['111', '222'] },
          integrantes: [{ rgm: '111', nome: 'Ana' }, { rgm: '222', nome: null }],
          orientador: { id: 'u1', nome: 'Prof. Bia' },
          turma: cohort,
        },
      }),
    );
    expect(text).toContain('Athena');
    expect(text).toContain('Ana');
    expect(text).toContain('Aguardando cadastroRGM 222');
    expect(text).toContain('Prof. Bia');
    expect(text).toContain('Engenharia de Software (Noite, 2026.2)');
  });

  it('without a cohort, explains the missing pre-authorization instead of the form', async () => {
    const text = await render(of({ turma: null, grupo: null }));
    expect(text).toContain('não está pré-autorizado');
    expect(text).not.toContain('Criar o PFC do meu grupo');
  });

  it('warns when the cohort has no program yet', async () => {
    const text = await render(of({ turma: cohort, grupo: null }));
    expect(text).toContain('ainda não tem PFC iniciado');
  });

  it('offers to create the PFC with a cohort and a program', async () => {
    const text = await render(of({ turma: cohort, programaId: 'p1', grupo: null }));
    expect(text).toContain('Criar o PFC do meu grupo');
  });

  it('shows why loading failed and does not fall back to the form', async () => {
    const text = await render(throwError(() => new Error('serviço fora do ar')));
    expect(text).toContain('Não foi possível carregar o seu PFC: serviço fora do ar');
    expect(text).not.toContain('Criar o PFC do meu grupo');
  });
});
