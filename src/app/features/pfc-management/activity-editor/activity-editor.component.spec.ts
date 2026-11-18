import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Activity } from '../../../core/models';
import { ActivityService } from '../../../core/services/activity.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ActivityEditorComponent } from './activity-editor.component';

const activity: Activity = {
  id: 'a1',
  titulo: 'Monografia',
  descricao: '',
  prazo: '2026-11-23T23:59:00',
  publicadaEm: '2026-11-01T10:00:00Z',
  campos: [
    { id: 'f1', rotulo: 'Arquivo da entrega', tipo: 'ARQUIVO', obrigatorio: true },
    { id: 'f2', rotulo: 'Link do repositório', tipo: 'LINK', obrigatorio: false },
  ],
};

function render(fail?: 'update', answer = true) {
  const calls: string[] = [];
  const service: Partial<ActivityService> = {
    addField: (_id, field) => {
      calls.push(`add ${field.rotulo}`);
      return of({ ...field, id: 'f3' });
    },
    removeField: (_id, fieldId) => {
      calls.push(`remove ${fieldId}`);
      return of(undefined);
    },
    update: (_id, body) => {
      calls.push(`update ${body.titulo}`);
      return fail === 'update' ? (throwError(() => new Error('Prazo inválido.')) as Observable<Activity>) : of(activity);
    },
  };
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: ActivityService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: () => Promise.resolve(answer) } },
    ],
  });
  const fixture = TestBed.createComponent(ActivityEditorComponent);
  fixture.componentRef.setInput('activity', activity);
  let closed = 0;
  fixture.componentInstance.closed.subscribe(() => closed++);
  fixture.detectChanges();
  return { fixture, editor: fixture.componentInstance, calls, closed: () => closed };
}

describe('ActivityEditorComponent', () => {
  it('keeps field changes in a draft and saves everything on "Salvar", new fields first', async () => {
    const { fixture, editor, calls, closed } = render();

    editor.addField({ rotulo: 'Resumo', tipo: 'TEXTO_LONGO', obrigatorio: true });
    editor.removeField(1);
    editor.form.controls.titulo.setValue('Monografia final');
    expect(calls).toEqual([]);
    expect(editor.fields().map((f) => f.rotulo)).toEqual(['Arquivo da entrega', 'Resumo']);

    await editor.save();
    await fixture.whenStable();
    expect(calls).toEqual(['add Resumo', 'remove f2', 'update Monografia final']);
    expect(closed()).toBe(1);
  });

  it('saves nothing on "Cancelar"', async () => {
    const { fixture, calls, closed } = render();
    fixture.componentInstance.removeField(0);
    const cancel = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar',
    )!;
    cancel.click();
    await fixture.whenStable();
    expect(calls).toEqual([]);
    expect(closed()).toBe(1);
  });

  it('saves nothing when the confirmation is declined', async () => {
    const { fixture, editor, calls, closed } = render(undefined, false);
    editor.addField({ rotulo: 'Resumo', tipo: 'TEXTO_LONGO', obrigatorio: true });
    await editor.save();
    await fixture.whenStable();
    expect(calls).toEqual([]);
    expect(closed()).toBe(0);
  });

  it('never removes the last field', () => {
    const { editor } = render();
    editor.removeField(0);
    editor.removeField(0);
    expect(editor.fields().length).toBe(1);
  });

  it('stays open with the error and warns that part of it may have been saved', async () => {
    const { fixture, editor, closed } = render('update');
    editor.addField({ rotulo: 'Resumo', tipo: 'TEXTO_LONGO', obrigatorio: true });
    await editor.save();
    await fixture.whenStable();
    expect(closed()).toBe(0);
    expect(editor.error()).toBe('Prazo inválido.');
    expect(editor.partialSave()).toBe(true);
  });
});
