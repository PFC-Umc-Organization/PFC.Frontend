import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formata um prazo ISO no padrão do protótipo: "20/08 às 23:59".
 * Com `longo`, inclui o ano: "20/08/2026 às 23:59".
 */
@Pipe({ name: 'prazo' })
export class PrazoPipe implements PipeTransform {
  transform(iso: string | null | undefined, longo = false): string {
    if (!iso) {
      return '—';
    }

    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) {
      return '—';
    }

    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const hora = String(data.getHours()).padStart(2, '0');
    const minuto = String(data.getMinutes()).padStart(2, '0');
    const ano = longo ? `/${data.getFullYear()}` : '';

    return `${dia}/${mes}${ano} às ${hora}:${minuto}`;
  }
}
