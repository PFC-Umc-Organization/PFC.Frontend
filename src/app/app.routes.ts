import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';

/** Paths are what the user sees in the address bar, so they stay in Portuguese. */
export const routes: Routes = [
  {
    path: 'entrar',
    canActivate: [guestGuard],
    title: 'Entrar — Athena',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'criar-conta',
    canActivate: [guestGuard],
    title: 'Criar conta — Athena',
    loadComponent: () => import('./features/auth/sign-up/sign-up.component').then((m) => m.SignUpComponent),
  },
  {
    path: 'confirmar-conta',
    canActivate: [guestGuard],
    title: 'Confirmar conta — Athena',
    loadComponent: () =>
      import('./features/auth/confirm-account/confirm-account.component').then((m) => m.ConfirmAccountComponent),
  },
  {
    path: 'esqueci-senha',
    canActivate: [guestGuard],
    title: 'Redefinir senha — Athena',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'nova-senha',
    canActivate: [guestGuard],
    title: 'Defina sua senha — Athena',
    loadComponent: () => import('./features/auth/new-password/new-password.component').then((m) => m.NewPasswordComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'Início — Athena',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'materiais',
        title: 'Materiais de apoio — Athena',
        loadComponent: () => import('./features/materials/materials.component').then((m) => m.MaterialsComponent),
      },
      {
        path: 'entregaveis',
        canActivate: [roleGuard(['ALUNO'])],
        title: 'Entregáveis — Athena',
        loadComponent: () =>
          import('./features/deliverables/deliverables.component').then((m) => m.DeliverablesComponent),
      },
      {
        path: 'referencias',
        title: 'Referências — Athena',
        loadComponent: () => import('./features/references/references.component').then((m) => m.ReferencesComponent),
      },
      {
        path: 'meu-pfc',
        canActivate: [roleGuard(['ALUNO'])],
        title: 'Meu PFC — Athena',
        loadComponent: () => import('./features/my-pfc/my-pfc.component').then((m) => m.MyPfcComponent),
      },
      {
        path: 'gestao',
        canActivate: [roleGuard(['ORIENTADOR', 'ADMIN'])],
        title: 'Gestão de PFC — Athena',
        loadComponent: () =>
          import('./features/pfc-management/pfc-management.component').then((m) => m.PfcManagementComponent),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard(['ADMIN'])],
        title: 'Usuários — Athena',
        loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'turmas',
        canActivate: [roleGuard(['ADMIN'])],
        title: 'Turmas — Athena',
        loadComponent: () => import('./features/cohorts/cohorts.component').then((m) => m.CohortsComponent),
      },
      {
        path: 'sem-acesso',
        title: 'Sem acesso — Athena',
        loadComponent: () => import('./features/notice/notice.component').then((m) => m.NoticeComponent),
        data: {
          icon: 'lock',
          heading: 'Área restrita',
          text: 'Esta seção não está disponível para o seu perfil. Se você acredita que deveria ter acesso, procure a coordenação do curso.',
        },
      },
      {
        path: '**',
        title: 'Página não encontrada — Athena',
        loadComponent: () => import('./features/notice/notice.component').then((m) => m.NoticeComponent),
        data: {
          icon: 'landmark',
          heading: 'Página não encontrada',
          text: 'O endereço que você tentou abrir não existe no portal.',
        },
      },
    ],
  },
];
