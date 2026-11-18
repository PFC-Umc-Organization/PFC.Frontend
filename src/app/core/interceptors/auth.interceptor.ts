import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// Interceptor
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isApi = req.url.startsWith(environment.apiBaseUrl);
  const isPublic = isApi && req.url.slice(environment.apiBaseUrl.length).startsWith('/auth/');
  const token = auth.token();

  if (!isApi || isPublic || !token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.token()) {
        const back = router.url;
        auth.signOut();
        void router.navigate(['/entrar'], {
          queryParams: { motivo: 'sessao-expirada', ...(back && back !== '/' && !back.startsWith('/entrar') ? { retorno: back } : {}) },
        });
      }
      return throwError(() => error);
    }),
  );
};
