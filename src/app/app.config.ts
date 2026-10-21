import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { rotas } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { deduplicarInterceptor } from './core/interceptors/deduplicar.interceptor';
import {
  AtividadeHttpService,
  AtividadeService,
} from './core/services/atividade.service';
import {
  ConviteHttpService,
  ConviteService,
} from './core/services/convite.service';
import { CursoHttpService, CursoService } from './core/services/curso.service';
import {
  EntregaHttpService,
  EntregaService,
} from './core/services/entrega.service';
import {
  GraduacaoHttpService,
  GraduacaoService,
} from './core/services/graduacao.service';
import {
  MaterialLocalService,
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
 * Único ponto do app que escolhe a implementação de cada service. Todos falam
 * com o backend, menos `Material`, que fica na memória do navegador até o
 * backend ter esse domínio.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Sem zone.js: a tela só é verificada quando um signal lido por ela muda
    // (ou num evento do template). Todo componente é OnPush e todo estado de
    // tela é signal — ver README, "Detecção de mudanças".
    provideZonelessChangeDetection(),
    provideRouter(rotas, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([deduplicarInterceptor, authInterceptor]),
    ),

    { provide: UsuarioService, useClass: UsuarioHttpService },
    { provide: CursoService, useClass: CursoHttpService },
    { provide: GraduacaoService, useClass: GraduacaoHttpService },
    { provide: ProgramaService, useClass: ProgramaHttpService },
    { provide: ProjetoService, useClass: ProjetoHttpService },
    { provide: ConviteService, useClass: ConviteHttpService },
    { provide: AtividadeService, useClass: AtividadeHttpService },
    { provide: EntregaService, useClass: EntregaHttpService },
    { provide: MaterialService, useClass: MaterialLocalService },
    { provide: MatriculaService, useClass: MatriculaHttpService },
    { provide: ReferenciaService, useClass: ReferenciaHttpService },
  ],
};
