import { Injector, provideZonelessChangeDetection, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';

import { loadable } from './loadable';

describe('loadable', () => {
  let injector: Injector;
  const flush = () => TestBed.tick();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    injector = TestBed.inject(Injector);
  });

  const make = <T, P = void>(opts: Parameters<typeof loadable<T, P>>[0]) =>
    runInInjectionContext(injector, () => loadable<T, P>(opts));

  it('loads on creation', () => {
    const source = vi.fn(() => of([1, 2]));
    const l = make({ source, initial: [] as number[] });
    flush();
    expect(source).toHaveBeenCalledTimes(1);
    expect(l.value()).toEqual([1, 2]);
    expect(l.loading()).toBe(false);
    expect(l.error()).toBe('');
  });

  it('reload calls the source again', () => {
    let n = 0;
    const l = make({ source: () => of(++n), initial: 0 });
    flush();
    expect(l.value()).toBe(1);
    l.reload();
    flush();
    expect(l.value()).toBe(2);
  });

  it('shows loading while the request is pending', () => {
    const subj = new Subject<string>();
    const l = make({ source: () => subj, initial: '' });
    flush();
    expect(l.loading()).toBe(true);
    subj.next('a');
    subj.complete();
    expect(l.loading()).toBe(false);
    expect(l.value()).toBe('a');
  });

  it('a params change cancels the previous request', () => {
    const params = signal<string | null>('a');
    let cancelled = 0;
    const source = (p: string): Observable<string> =>
      new Observable((sub) => {
        if (p === 'b') {
          sub.next('B');
          sub.complete();
        }
        return () => {
          if (p === 'a') cancelled++;
        };
      });
    const l = make({ source, params, initial: '' });
    flush();
    expect(l.loading()).toBe(true);
    params.set('b');
    flush();
    expect(cancelled).toBe(1);
    expect(l.value()).toBe('B');
    expect(l.loading()).toBe(false);
  });

  it('an error fills error and returns initial', () => {
    const l = make({ source: () => throwError(() => new Error('falhou')), initial: ['x'] });
    flush();
    expect(l.error()).toBe('falhou');
    expect(l.value()).toEqual(['x']);
    expect(l.loading()).toBe(false);
  });

  it('clears the error on a successful reload', () => {
    let fail = true;
    const l = make({
      source: () => (fail ? throwError(() => new Error('falhou')) : of('ok')),
      initial: '',
    });
    flush();
    expect(l.error()).toBe('falhou');
    fail = false;
    l.reload();
    flush();
    expect(l.error()).toBe('');
    expect(l.value()).toBe('ok');
  });

  it('null params do not call the source and emit initial', () => {
    const params = signal<string | null>(null);
    const source = vi.fn((p: string) => of(p));
    const l = make({ source, params, initial: 'none' });
    flush();
    expect(source).not.toHaveBeenCalled();
    expect(l.value()).toBe('none');
    expect(l.loading()).toBe(false);
    params.set('go');
    flush();
    expect(source).toHaveBeenCalledWith('go');
    expect(l.value()).toBe('go');
    params.set(null);
    flush();
    expect(l.value()).toBe('none');
    expect(l.loading()).toBe(false);
  });
});
