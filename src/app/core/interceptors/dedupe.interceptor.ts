import { HttpContextToken, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, finalize, share } from 'rxjs';

const inFlight = new Map<string, Observable<HttpEvent<unknown>>>();

// Contexto
export const SKIP_DEDUPE = new HttpContextToken<boolean>(() => false);

/** @internal for tests */
// Reset
export function resetDedupe(): void {
  inFlight.clear();
}

// Interceptor
export const dedupeInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || req.context.get(SKIP_DEDUPE)) {
    return next(req);
  }
  const key = `${req.responseType}|${req.urlWithParams}`;
  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }
  const shared = next(req).pipe(
    finalize(() => inFlight.delete(key)),
    share(),
  );
  inFlight.set(key, shared);
  return shared;
};
