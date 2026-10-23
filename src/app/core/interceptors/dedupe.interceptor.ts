import { HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, finalize, share } from 'rxjs';

/** GETs in flight, by full URL (with the query string). */
const inFlight = new Map<string, Observable<HttpEvent<unknown>>>();

/**
 * Joins identical GETs in flight at the same time into one request: screens
 * combine several lists and different services ask for the same one at once.
 * It is not a cache: once the request ends, the next call goes to the server.
 */
export const dedupeInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }
  const key = req.urlWithParams;
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
