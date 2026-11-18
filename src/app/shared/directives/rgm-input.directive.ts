import { Directive, ElementRef, HostListener, computed, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

export const RGM_LENGTH = 11;

/** The digits of one RGM, cut at its length. */
export function rgmDigits(text: string): string {
  return text.replace(/\D/g, '').slice(0, RGM_LENGTH);
}

/**
 * Several RGMs, one per `separator`: each run of digits is an RGM and a longer
 * one is cut into RGM-sized pieces. `closing` leaves the separator after a
 * complete last RGM, so the next one starts on its own.
 */
export function rgmList(text: string, separator: string, closing: boolean): string {
  const rgms = text
    .split(/\D+/)
    .flatMap((run) => run.match(new RegExp(`\\d{1,${RGM_LENGTH}}`, 'g')) ?? []);
  const list = rgms.join(separator);
  return closing && rgms.at(-1)?.length === RGM_LENGTH ? list + separator : list;
}

/** Where the caret goes: right after the `digits`-th digit of `text`, or at the end once past the last one. */
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

/**
 * Keeps an RGM field to digits. Alone, a field takes one RGM of up to 11 digits.
 * With `appRgm="list"` it takes several: a text area gets one per line and a
 * one-line field a comma-separated list, and the next one starts on its own
 * when an RGM is complete.
 */
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
