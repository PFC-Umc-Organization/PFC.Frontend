import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Reference } from '../../../core/models';
import { ReferenceService } from '../../../core/services/reference.service';
import { ReferenceListComponent } from './reference-list.component';

const ref: Reference = {
  id: 'r1',
  projetoId: 'pr1',
  doi: '10.1/errado',
  titulo: 'Gestão de projetos ágeis',
  abnt: 'SILVA, Ana. Gestão de projetos ágeis. 2024.',
  abntHtml: 'SILVA, Ana. <strong>Gestão de projetos ágeis</strong>. 2024.',
  adicionadaPor: 'Ana',
  adicionadaEm: '2026-11-10T12:00:00Z',
};

async function render(replace: ReferenceService['replace'], editable = true) {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), { provide: ReferenceService, useValue: { replace } }],
  });
  const fixture = TestBed.createComponent(ReferenceListComponent);
  fixture.componentRef.setInput('references', [ref]);
  fixture.componentRef.setInput('editable', editable);
  let changed = 0;
  fixture.componentInstance.changed.subscribe(() => changed++);
  await fixture.whenStable();
  const host = fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim().startsWith(label));
  return { fixture, host, button, changed: () => changed };
}

describe('ReferenceListComponent edit', () => {
  it('corrects a reference by its DOI and reloads the list', async () => {
    const calls: unknown[][] = [];
    const { fixture, host, button, changed } = await render((...args) => {
      calls.push(args);
      return of({ ...ref, doi: '10.1109/2.485845' });
    });

    button('Editar')!.click();
    await fixture.whenStable();
    const input = host.querySelector<HTMLInputElement>('#doi-r1')!;
    expect(input.value).toBe('10.1/errado');

    input.value = ' 10.1109/2.485845 ';
    input.dispatchEvent(new Event('input'));
    host.querySelector<HTMLFormElement>('.reference__edit')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(calls).toEqual([['pr1', 'r1', '10.1109/2.485845']]);
    expect(host.querySelector('.reference__edit')).toBeNull();
    expect(host.textContent).toContain('Referência atualizada.');
    expect(changed()).toBe(1);
  });

  it('keeps the form open with the error when the backend refuses', async () => {
    const { fixture, host, button, changed } = await render(() =>
      throwError(() => new Error('Esta referência já está na lista do projeto.')),
    );

    button('Editar')!.click();
    await fixture.whenStable();
    host.querySelector<HTMLFormElement>('.reference__edit')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(host.querySelector('.reference__edit')).not.toBeNull();
    expect(host.textContent).toContain('Esta referência já está na lista do projeto.');
    expect(changed()).toBe(0);
  });

  it('does not offer editing to the staff, who only read the list', async () => {
    const { button } = await render(() => of(ref), false);
    expect(button('Editar')).toBeUndefined();
  });
});
