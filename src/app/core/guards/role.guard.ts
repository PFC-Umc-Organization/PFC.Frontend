import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '../models';
import { AuthService } from '../services/auth.service';

export function roleGuard(allowed: Role[]): CanActivateFn {
  return () => {
    const role = inject(AuthService).role();
    return role && allowed.includes(role) ? true : inject(Router).createUrlTree(['/sem-acesso']);
  };
}
