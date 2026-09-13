import { Routes } from '@angular/router';

import { authGuard, visitanteGuard } from './core/guards/auth.guard';
import { perfilGuard } from './core/guards/perfil.guard';
import { LayoutComponent } from './shared/components/layout.component';

export const rotas: Routes = [
  /* ------------------------- área pública ------------------------- */
  {
    path: 'entrar',
    canActivate: [visitanteGuard],
    title: 'Entrar — Athena',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'criar-conta',
    canActivate: [visitanteGuard],
    title: 'Criar conta — Athena',
    loadComponent: () =>
      import('./features/auth/cadastro.component').then(
        (m) => m.CadastroComponent,
      ),
  },

  /* ------------------------- área interna ------------------------- */
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'Início — Athena',
        loadComponent: () =>
          import('./features/inicio/inicio.component').then(
            (m) => m.InicioComponent,
          ),
      },
      {
        path: 'materiais',
        title: 'Materiais de apoio — Athena',
        loadComponent: () =>
          import('./features/materiais/materiais.component').then(
            (m) => m.MateriaisComponent,
          ),
      },
      {
        path: 'meu-pfc',
        canActivate: [perfilGuard(['ALUNO'])],
        title: 'Meu PFC — Athena',
        loadComponent: () =>
          import('./features/aluno/meu-pfc.component').then(
            (m) => m.MeuPfcComponent,
          ),
      },
      {
        path: 'gestao',
        canActivate: [perfilGuard(['PROFESSOR', 'COORDENADOR'])],
        title: 'Gestão de PFC — Athena',
        loadComponent: () =>
          import('./features/professor/gestao-pfc.component').then(
            (m) => m.GestaoPfcComponent,
          ),
      },
      {
        path: 'atividades',
        canActivate: [perfilGuard(['PROFESSOR', 'COORDENADOR'])],
        title: 'Atividades — Athena',
        loadComponent: () =>
          import('./features/professor/atividades.component').then(
            (m) => m.AtividadesComponent,
          ),
      },
      {
        path: 'usuarios',
        canActivate: [perfilGuard(['PROFESSOR', 'COORDENADOR'])],
        title: 'Usuários — Athena',
        loadComponent: () =>
          import('./features/professor/usuarios.component').then(
            (m) => m.UsuariosComponent,
          ),
      },
      {
        path: 'sem-acesso',
        title: 'Sem acesso — Athena',
        loadComponent: () =>
          import('./features/erros/sem-acesso.component').then(
            (m) => m.SemAcessoComponent,
          ),
      },
      {
        path: '**',
        title: 'Página não encontrada — Athena',
        loadComponent: () =>
          import('./features/erros/nao-encontrada.component').then(
            (m) => m.NaoEncontradaComponent,
          ),
      },
    ],
  },
];
