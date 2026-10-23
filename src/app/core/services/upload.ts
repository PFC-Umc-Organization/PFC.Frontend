import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, catchError, filter, map, throwError } from 'rxjs';

import { UploadEvent } from '../models';

/** The backend's answer when asked to upload a file. */
export interface UploadTicket {
  url: string;
  campos: Record<string, string>;
  chave: string;
}

/** Posts the file straight to the bucket with the signed form, reporting progress. */
export function uploadToBucket(
  http: HttpClient,
  ticket: UploadTicket,
  file: File,
): Observable<UploadEvent> {
  const form = new FormData();
  Object.entries(ticket.campos).forEach(([k, v]) => form.append(k, v));
  form.append('file', file);
  return http
    .post(ticket.url, form, { reportProgress: true, observe: 'events', responseType: 'text' })
    .pipe(
      map((ev): UploadEvent | null => {
        if (ev.type === HttpEventType.UploadProgress) {
          return { kind: 'progress', percent: Math.round((100 * ev.loaded) / (ev.total || file.size)) };
        }
        return ev.type === HttpEventType.Response ? { kind: 'done', key: ticket.chave } : null;
      }),
      filter((ev): ev is UploadEvent => ev !== null),
      catchError(() =>
        throwError(() => new Error('O envio do arquivo falhou. Confira a conexão e tente de novo.')),
      ),
    );
}
