import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

/**
 * Todo erro do backend em Go vem como `{ "erro": "mensagem" }` (ver
 * `common.Erro` no PFC.Backend). Este helper extrai essa mensagem e a
 * embrulha num `Error` comum, no mesmo formato que os `*MockService` já
 * produzem — os componentes continuam lendo `e.message` sem saber se quem
 * respondeu foi o mock ou a API de verdade.
 */
export function erroHttp(e: HttpErrorResponse): Observable<never> {
  const corpo = e.error as unknown;
  const mensagem =
    corpo && typeof corpo === 'object' && 'erro' in corpo
      ? String((corpo as { erro: unknown }).erro)
      : 'Não foi possível concluir a operação.';

  return throwError(() => new Error(mensagem));
}
