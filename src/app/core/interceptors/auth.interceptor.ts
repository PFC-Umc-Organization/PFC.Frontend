import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const ehRotaPublica = req.url.includes('/auth/');
  const token = auth.token();

  if (ehRotaPublica || !token) {
    return next(req);
  }

  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  ).pipe(
    catchError((erro: unknown) => {
      // 401 numa rota protegida = token vencido/inválido (o ID token do
      // Cognito dura 1h). Sem isso a tela ficava "logada" com todas as
      // chamadas falhando — encerra a sessão e manda pro login.
      if (erro instanceof HttpErrorResponse && erro.status === 401) {
        auth.sair();
        void router.navigate(['/entrar']);
      }
      return throwError(() => erro);
    }),
  );
};
