import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Bloqueia rotas internas para quem não está autenticado. */
export const authGuard: CanActivateFn = (_rota, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.autenticado()) {
    return true;
  }

  return router.createUrlTree(['/entrar'], {
    queryParams: { retorno: estado.url },
  });
};

/** Impede que quem já entrou volte para a tela de login. */
export const visitanteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.autenticado() ? router.createUrlTree(['/']) : true;
};
