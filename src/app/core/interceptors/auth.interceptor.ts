import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // Only the API gets the token: S3 refuses a signed upload that also has Authorization.
  const isApi = req.url.startsWith(environment.apiBaseUrl);
  const isPublic = req.url.includes('/auth/');
  const token = auth.token();

  if (!isApi || isPublic || !token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      // The Cognito ID token lasts 1 h; without this the app stayed "signed in" with every call failing.
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.signOut();
        void router.navigate(['/entrar']);
      }
      return throwError(() => error);
    }),
  );
};
