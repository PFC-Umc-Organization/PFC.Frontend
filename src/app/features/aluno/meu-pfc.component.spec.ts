import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { MeuPfc } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ConviteService } from '../../core/services/convite.service';
import { ProjetoService } from '../../core/services/projeto.service';
import { MeuPfcComponent } from './meu-pfc.component';

const turma = { id: 't1', nome: 'Engenharia de Software', turno: 'NOITE' as const, periodo: '2026.2' };

async function renderizar(meuPfc: Observable<MeuPfc>): Promise<string> {
  TestBed.configureTestingModule({
    imports: [MeuPfcComponent],
    providers: [
      provideZonelessChangeDetection(),
      { provide: ProjetoService, useValue: { meuPfc: () => meuPfc } },
      { provide: ConviteService, useValue: { meusConvites: () => of([]), doGrupo: () => of([]) } },
      { provide: AuthService, useValue: { usuario: signal({ perfil: 'ALUNO', email: '111@alunos.umc.br', rgm: '111' }) } },
    ],
  });
  const fixture = TestBed.createComponent(MeuPfcComponent);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('MeuPfcComponent', () => {
  it('mostra o grupo com nomes, turma, orientador e quem ainda não tem conta', async () => {
    const texto = await renderizar(
      of({
        turma,
        programaId: 'p1',
        grupo: {
          projeto: { id: 'pr1', nome: 'Athena', descricao: 'Portal', programaId: 'p1', integrantes: ['111', '222'] },
          integrantes: [{ rgm: '111', nome: 'Ana' }, { rgm: '222', nome: null }],
          orientador: { id: 'u1', nome: 'Prof. Bia' },
          turma,
        },
      }),
    );
    expect(texto).toContain('Athena');
    expect(texto).toContain('Ana');
    expect(texto).toContain('RGM 222 (aguardando cadastro)');
    expect(texto).toContain('Prof. Bia');
    expect(texto).toContain('Engenharia de Software - Noite - 2026.2');
  });

  it('sem turma, explica que falta a pré-autorização em vez de mostrar o formulário', async () => {
    const texto = await renderizar(of({ turma: null, grupo: null }));
    expect(texto).toContain('não está pré-autorizado');
    expect(texto).not.toContain('Criar o PFC do meu grupo');
  });

  it('turma sem programa avisa que o PFC não foi iniciado', async () => {
    const texto = await renderizar(of({ turma, grupo: null }));
    expect(texto).toContain('ainda não tem PFC iniciado');
  });

  it('com turma e programa, oferece criar o PFC', async () => {
    const texto = await renderizar(of({ turma, programaId: 'p1', grupo: null }));
    expect(texto).toContain('Criar o PFC do meu grupo');
  });

  it('erro ao carregar mostra o motivo e não cai no formulário', async () => {
    const texto = await renderizar(throwError(() => new Error('serviço fora do ar')));
    expect(texto).toContain('Não foi possível carregar o seu PFC: serviço fora do ar');
    expect(texto).not.toContain('Criar o PFC do meu grupo');
  });
});
