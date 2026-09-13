import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { rotas } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import {
  AtividadeMockService,
  AtividadeService,
} from './core/services/atividade.service';
import { CursoMockService, CursoService } from './core/services/curso.service';
import {
  EntregaMockService,
  EntregaService,
} from './core/services/entrega.service';
import {
  MaterialMockService,
  MaterialService,
} from './core/services/material.service';
import {
  MatriculaHttpService,
  MatriculaService,
} from './core/services/matricula.service';
import {
  ProgramaHttpService,
  ProgramaService,
} from './core/services/programa.service';
import {
  ProjetoHttpService,
  ProjetoService,
} from './core/services/projeto.service';
import {
  UsuarioHttpService,
  UsuarioService,
} from './core/services/usuario.service';

/**
 * Este é o único ponto do app que sabe QUAL implementação dos services está
 * em uso.
 *
 * `Usuario` (login/cadastro), `Programa`, `Projeto` e `Matricula` já falam
 * com o backend real (ver README, seção "Endpoints que o front espera").
 * `Curso`, `Atividade`, `Entrega` e `Material` continuam no mock — o
 * backend ainda não tem esses domínios implementados.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(rotas, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),

    { provide: UsuarioService, useClass: UsuarioHttpService },
    { provide: CursoService, useClass: CursoMockService },
    { provide: ProgramaService, useClass: ProgramaHttpService },
    { provide: ProjetoService, useClass: ProjetoHttpService },
    { provide: AtividadeService, useClass: AtividadeMockService },
    { provide: EntregaService, useClass: EntregaMockService },
    { provide: MaterialService, useClass: MaterialMockService },
    { provide: MatriculaService, useClass: MatriculaHttpService },
  ],
};
