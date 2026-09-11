import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { rotas } from './app.routes';
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
  ProjetoMockService,
  ProjetoService,
} from './core/services/projeto.service';
import {
  UsuarioMockService,
  UsuarioService,
} from './core/services/usuario.service';

/**
 * Este é o único ponto do app que sabe QUAL implementação dos services está
 * em uso.
 *
 * Para plugar a API em Go, escreva as versões `*HttpService` (usando
 * HttpClient), adicione `provideHttpClient()` aqui e troque a classe do lado
 * direito de cada `useClass` — nenhum componente precisa ser alterado.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(rotas, withComponentInputBinding()),

    { provide: UsuarioService, useClass: UsuarioMockService },
    { provide: CursoService, useClass: CursoMockService },
    { provide: ProjetoService, useClass: ProjetoMockService },
    { provide: AtividadeService, useClass: AtividadeMockService },
    { provide: EntregaService, useClass: EntregaMockService },
    { provide: MaterialService, useClass: MaterialMockService },
  ],
};
