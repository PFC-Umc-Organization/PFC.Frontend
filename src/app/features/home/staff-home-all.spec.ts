import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Observable, delay, of } from 'rxjs';

import { Cohort } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CohortService } from '../../core/services/cohort.service';
import { PanelService } from '../../core/services/panel.service';
import { ProgramService } from '../../core/services/program.service';
import { ProjectService } from '../../core/services/project.service';
import { UserService } from '../../core/services/user.service';
import { StaffHomeComponent } from './staff-home/staff-home.component';

const cohorts = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, nome: `Curso ${i}`, turno: 'NOITE', periodo: '2026.2' }) as Cohort);
const programs = cohorts.map((c, i) => ({ id: `p${i}`, cursoId: c.id }));

// Atraso
const later = <T>(value: T, ms = 5): Observable<T> => of(value).pipe(delay(ms));

// Configuração
function configure(role: 'ADMIN' | 'ORIENTADOR') {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '__todas__' } } } },
      { provide: AuthService, useValue: { role: signal(role), user: signal({ id: 'u1', perfil: role, nome: 'Ana' }) } },
      { provide: CohortService, useValue: { list: () => later(cohorts) } },
      { provide: ProgramService, useValue: { list: () => later(programs, 20) } },
      { provide: ProjectService, useValue: { list: () => later([]) } },
      { provide: UserService, useValue: { list: () => later([]) } },
      { provide: PanelService, useValue: { ofProgram: (id: string) =>
            later({
              projetos: [{ id: `pr-${id}`, nome: `Projeto ${id}`, descricao: '', programaId: id, integrantes: [], orientadorId: 'u1' }],
              atividades: [],
              entregas: [],
              penalidades: [],
            }), } },
    ],
  });
}

describe('StaffHomeComponent with every cohort', () => {
  beforeAll(() => {
    // Stub do ResizeObserver
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  });

  for (const role of ['ADMIN', 'ORIENTADOR'] as const) {
    it(`finishes loading with more programs than the batch limit (${role})`, async () => {
      configure(role);
      const fixture = TestBed.createComponent(StaffHomeComponent);
      await new Promise((r) => setTimeout(r, 400));
      await fixture.whenStable();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.textContent).not.toContain('Carregando projetos');
    });
  }
});
