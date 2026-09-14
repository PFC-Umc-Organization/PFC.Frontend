import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Perfil } from '../models';
import { AuthService } from '../services/auth.service';


export function perfilGuard(perfisPermitidos: Perfil[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const perfil = auth.perfil();

    if (perfil && perfisPermitidos.includes(perfil)) {
      return true;
    }

    return router.createUrlTree(['/sem-acesso']);
  };
}
