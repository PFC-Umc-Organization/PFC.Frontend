import { MonoTypeOperatorFunction, retry, throwError, timer } from 'rxjs';

import { ApiError } from '../services/http-error';

const TRANSIENT = new Set([0, 429, 500, 502, 503, 504]);

// ---------------------------------------------------------------------------
// Retentativa
// ---------------------------------------------------------------------------

// Transitório
export function isTransient(error: unknown): boolean {
  const status = (error as ApiError | undefined)?.status;
  return status !== undefined && TRANSIENT.has(status);
}

// Repetição
export function retryTransient<T>(delays: readonly number[] = [500, 1200]): MonoTypeOperatorFunction<T> {
  return retry({
    count: delays.length,
    delay: (error, attempt) => (isTransient(error) ? timer(delays[attempt - 1]) : throwError(() => error)),
  });
}
