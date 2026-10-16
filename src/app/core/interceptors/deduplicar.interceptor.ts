import { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, finalize, share } from 'rxjs';

/** GETs em voo, pela URL completa (com query string). */
const emVoo = new Map<string, Observable<HttpEvent<unknown>>>();

/**
 * Junta GETs idênticos que estão em voo ao mesmo tempo numa só requisição.
 *
 * As telas montam os dados juntando várias listas, e services diferentes
 * pedem a mesma lista no mesmo instante (a gestão pedia `/programas` três
 * vezes ao abrir). Não é cache: terminada a requisição, a próxima chamada
 * vai ao servidor de novo — não há como mostrar dado velho.
 */
export const deduplicarInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }

  const chave = req.urlWithParams;
  const existente = emVoo.get(chave);
  if (existente) {
    return existente;
  }

  const compartilhado = next(req).pipe(
    finalize(() => emVoo.delete(chave)),
    share(),
  );
  emVoo.set(chave, compartilhado);
  return compartilhado;
};
