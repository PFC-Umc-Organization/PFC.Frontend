import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { RgmInputDirective, rgmDigits, rgmList } from './rgm-input.directive';

describe('rgmDigits', () => {
  it('keeps only digits, up to 11', () => {
    expect(rgmDigits('11.231-103420')).toBe('11231103420');
    expect(rgmDigits('123456789012345')).toBe('12345678901');
    expect(rgmDigits('abc')).toBe('');
  });
});

describe('rgmList', () => {
  it('puts each RGM on its own line and closes a complete one only while typing', () => {
    expect(rgmList('11231103420', '\n', true)).toBe('11231103420\n');
    expect(rgmList('11231103420', '\n', false)).toBe('11231103420');
    expect(rgmList('112311034', '\n', true)).toBe('112311034');
  });

  it('splits pasted text on any separator and cuts runs that are too long', () => {
    expect(rgmList('11231103420, 11231103421;11231103422', '\n', false)).toBe('11231103420\n11231103421\n11231103422');
    expect(rgmList('1123110342011231103421', '\n', false)).toBe('11231103420\n11231103421');
  });

  it('drops anything that is not a digit and uses the given separator', () => {
    expect(rgmList('a11231103420b', ', ', true)).toBe('11231103420, ');
    expect(rgmList('', ', ', true)).toBe('');
  });
});

@Component({
  imports: [ReactiveFormsModule, RgmInputDirective],
  template: `
    <input id="one" appRgm [formControl]="one" />
    <textarea id="many" appRgm="list" [formControl]="many"></textarea>
  `,
})
class Host {
  one = new FormControl('', { nonNullable: true });
  many = new FormControl('', { nonNullable: true });
}

describe('RgmInputDirective', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const type = (selector: string, value: string, inputType = 'insertText') => {
      const el = root.querySelector<HTMLInputElement>(selector)!;
      el.value = value;
      el.dispatchEvent(new InputEvent('input', { inputType }));
    };
    return { fixture, root, type };
  }

  it('takes only digits, up to 11, in a single field', () => {
    const { fixture, type } = setup();
    type('#one', '1123a1103420999');
    expect(fixture.componentInstance.one.value).toBe('11231103420');
    expect(fixture.nativeElement.querySelector('#one').getAttribute('maxlength')).toBe('11');
  });

  it('starts a new line when an RGM is complete, and lets the user delete it', () => {
    const { fixture, type } = setup();
    type('#many', '11231103420');
    expect(fixture.componentInstance.many.value).toBe('11231103420\n');

    type('#many', '11231103420', 'deleteContentBackward');
    expect(fixture.componentInstance.many.value).toBe('11231103420');
  });
});
