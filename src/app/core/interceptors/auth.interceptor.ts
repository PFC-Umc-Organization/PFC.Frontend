import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';

/**
 * As rotas `/auth/*` (login, registrar) são as únicas marcadas
 * `protected = false` na API Gateway — o resto exige um Bearer token
 * válido do Cognito (JWT Authorizer). Ver `modules/api-gateway/variables.tf`
 * no Terraform.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const ehRotaPublica = req.url.includes('/auth/');
  const token = auth.token();

  if (ehRotaPublica || !token) {
    return next(req);
  }

  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
