import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { rotas } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import {
  AtividadeHttpService,
  AtividadeService,
} from './core/services/atividade.service';
import { CursoHttpService, CursoService } from './core/services/curso.service';
import {
  EntregaHttpService,
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
  ReferenciaHttpService,
  ReferenciaService,
} from './core/services/referencia.service';
import {
  UsuarioHttpService,
  UsuarioService,
} from './core/services/usuario.service';

/**
 * Este é o único ponto do app que sabe QUAL implementação dos services está
 * em uso.
 *
 * `Usuario` (login/cadastro), `Curso`, `Programa`, `Projeto`, `Matricula`, `Referencia`,
 * `Atividade` e `Entrega` já falam com o backend real (ver README, seção "Endpoints
 * que o front espera"). Pra demonstrar sem backend, troque por
 * `*MockService`.
 * Só `Material` continua no mock — o backend ainda não tem esse domínio.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(rotas, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),

    { provide: UsuarioService, useClass: UsuarioHttpService },
    { provide: CursoService, useClass: CursoHttpService },
    { provide: ProgramaService, useClass: ProgramaHttpService },
    { provide: ProjetoService, useClass: ProjetoHttpService },
    { provide: AtividadeService, useClass: AtividadeHttpService },
    { provide: EntregaService, useClass: EntregaHttpService },
    { provide: MaterialService, useClass: MaterialMockService },
    { provide: MatriculaService, useClass: MatriculaHttpService },
    { provide: ReferenciaService, useClass: ReferenciaHttpService },
  ],
};
