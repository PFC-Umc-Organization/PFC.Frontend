import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, catchError, filter, map, throwError } from 'rxjs';

import { EnvioArquivo } from '../models';

/** Resposta do backend ao pedir o envio de um arquivo. */
export interface TicketArquivo {
  url: string;
  campos: Record<string, string>;
  chave: string;
}

/**
 * Manda o arquivo direto para o bucket com o formulário assinado, emitindo o
 * progresso e, no fim, a chave do arquivo.
 */
export function enviarParaBucket(
  http: HttpClient,
  ticket: TicketArquivo,
  arquivo: File,
): Observable<EnvioArquivo> {
  const form = new FormData();
  Object.entries(ticket.campos).forEach(([k, v]) => form.append(k, v));
  form.append('file', arquivo);
  return http
    .post(ticket.url, form, { reportProgress: true, observe: 'events', responseType: 'text' })
    .pipe(
      map((ev): EnvioArquivo | null => {
        if (ev.type === HttpEventType.UploadProgress) {
          return {
            tipo: 'progresso',
            percentual: Math.round((100 * ev.loaded) / (ev.total || arquivo.size)),
          };
        }
        return ev.type === HttpEventType.Response ? { tipo: 'pronto', chave: ticket.chave } : null;
      }),
      filter((ev): ev is EnvioArquivo => ev !== null),
      catchError(() =>
        throwError(() => new Error('O envio do arquivo falhou — confira a conexão e tente de novo.')),
      ),
    );
}
