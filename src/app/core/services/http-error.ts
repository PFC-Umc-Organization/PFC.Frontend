import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

/** An API error carrying the backend's message and the HTTP status. */
export interface ApiError extends Error {
  status?: number;
}

export function toApiError(e: HttpErrorResponse): Observable<never> {
  const body = e.error as unknown;
  const message =
    body && typeof body === 'object' && 'erro' in body
      ? String((body as { erro: unknown }).erro)
      : 'Não foi possível concluir a operação.';

  const error: ApiError = new Error(message);
  error.status = e.status;
  return throwError(() => error);
}
