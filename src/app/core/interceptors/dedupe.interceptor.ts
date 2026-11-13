import { HttpContextToken, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, finalize, share } from 'rxjs';

/** GETs in flight, by response type and full URL (with the query string). */
const inFlight = new Map<string, Observable<HttpEvent<unknown>>>();

/** Set to true on a request that must not join (or be joined by) another one. */
export const SKIP_DEDUPE = new HttpContextToken<boolean>(() => false);

/** @internal for tests */
export function resetDedupe(): void {
  inFlight.clear();
}

/**
 * Joins identical GETs in flight at the same time into one request: screens
 * combine several lists and different services ask for the same one at once.
 * It is not a cache: once the request ends, the next call goes to the server.
 *
 * Keep it before `authInterceptor` in the chain: a 401 shared by several
 * callers is then seen once by the auth interceptor, so `signOut` runs once.
 * `finalize` sits before `share()`, so the entry is removed on complete, error
 * and when every subscriber unsubscribes.
 */
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
