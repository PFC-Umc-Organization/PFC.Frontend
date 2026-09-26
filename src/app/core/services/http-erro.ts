import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';


/** Erro de API com a mensagem do backend e o status HTTP original. */
export interface ErroApi extends Error {
  status?: number;
}

export function erroHttp(e: HttpErrorResponse): Observable<never> {
  const corpo = e.error as unknown;
  const mensagem =
    corpo && typeof corpo === 'object' && 'erro' in corpo
      ? String((corpo as { erro: unknown }).erro)
      : 'Não foi possível concluir a operação.';

  const erro: ErroApi = new Error(mensagem);
  erro.status = e.status;
  return throwError(() => erro);
}
