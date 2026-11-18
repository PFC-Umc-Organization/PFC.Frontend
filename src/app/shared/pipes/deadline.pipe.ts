import { Pipe, PipeTransform } from '@angular/core';

// Pipe
@Pipe({ name: 'deadline' })
export class DeadlinePipe implements PipeTransform {
  // Formatação
  transform(iso: string | null | undefined, long = false): string {
    if (!iso) {
      return '—';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = long ? `/${date.getFullYear()}` : '';
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}${year} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
