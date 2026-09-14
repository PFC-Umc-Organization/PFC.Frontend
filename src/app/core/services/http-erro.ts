import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';


export function erroHttp(e: HttpErrorResponse): Observable<never> {
  const corpo = e.error as unknown;
  const mensagem =
    corpo && typeof corpo === 'object' && 'erro' in corpo
      ? String((corpo as { erro: unknown }).erro)
      : 'Não foi possível concluir a operação.';

  return throwError(() => new Error(mensagem));
}
