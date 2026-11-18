import { Directive, ElementRef, HostListener, computed, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

export const RGM_LENGTH = 11;

// Dígitos
export function rgmDigits(text: string): string {
  return text.replace(/\D/g, '').slice(0, RGM_LENGTH);
}

// Lista
export function rgmList(text: string, separator: string, closing: boolean): string {
  const rgms = text
    .split(/\D+/)
    .flatMap((run) => run.match(new RegExp(`\\d{1,${RGM_LENGTH}}`, 'g')) ?? []);
  const list = rgms.join(separator);
  return closing && rgms.at(-1)?.length === RGM_LENGTH ? list + separator : list;
}

// Cursor
function caretAfter(text: string, digits: number): number {
  if (digits === 0) {
    return 0;
  }
  if (digits >= (text.match(/\d/g) ?? []).length) {
    return text.length;
  }
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]) && ++seen === digits) {
      return i + 1;
    }
  }
  return text.length;
}

// Diretiva
@Directive({
  selector: 'input[appRgm], textarea[appRgm]',
  host: {
    inputmode: 'numeric',
    autocomplete: 'off',
    '[attr.maxlength]': 'single() ? length : null',
  },
})
export class RgmInputDirective {
  private readonly el = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;
  private readonly control = inject(NgControl, { optional: true, self: true });

  readonly appRgm = input<'' | 'list'>('');
  protected readonly single = computed(() => this.appRgm() !== 'list');
  protected readonly length = RGM_LENGTH;

  @HostListener('input', ['$event'])
  protected normalize(event: Event): void {
    const raw = this.el.value;
    // Deleting must not bring the separator back.
    const typing = (event as InputEvent).inputType?.startsWith('insert') ?? true;
    const separator = this.el instanceof HTMLTextAreaElement ? '\n' : ', ';
    const next = this.single() ? rgmDigits(raw) : rgmList(raw, separator, typing);
    if (next === raw) {
      return;
    }
    const before = raw.slice(0, this.el.selectionStart ?? raw.length).replace(/\D/g, '').length;
    this.control?.control?.setValue(next);
    this.el.value = next;
    const caret = caretAfter(next, before);
    this.el.setSelectionRange(caret, caret);
  }
}
