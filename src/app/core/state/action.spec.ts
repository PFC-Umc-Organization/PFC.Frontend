import { Injector, provideZonelessChangeDetection, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';

import { action } from './action';

describe('action', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    injector = TestBed.inject(Injector);
  });

  const make = <A extends unknown[], R>(fn: (...a: A) => Observable<R>, opts?: Parameters<typeof action<A, R>>[1]) =>
    runInInjectionContext(injector, () => action(fn, opts));

  it('does nothing until run', () => {
    const fn = vi.fn(() => of(1));
    const a = make(fn);
    expect(fn).not.toHaveBeenCalled();
    expect(a.pending()).toBe(false);
    expect(a.error()).toBe('');
  });

  it('runs with its arguments and calls onSuccess with the result', () => {
    const onSuccess = vi.fn();
    const a = make((x: number, y: string) => of(`${x}${y}`), { onSuccess });
    a.run(1, 'a');
    expect(onSuccess).toHaveBeenCalledWith('1a', 1, 'a');
    expect(a.pending()).toBe(false);
  });

  it('is pending while in flight', () => {
    const subj = new Subject<number>();
    const a = make(() => subj);
    a.run();
    expect(a.pending()).toBe(true);
    subj.next(1);
    subj.complete();
    expect(a.pending()).toBe(false);
  });

  it('fills error, calls onError and can run again after a failure', () => {
    const onError = vi.fn();
    let fail = true;
    const a = make((_: number) => (fail ? throwError(() => new Error('Falhou.')) : of(1)), { onError });
    a.run(1);
    expect(a.error()).toBe('Falhou.');
    expect(a.pending()).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    fail = false;
    a.run(2);
    expect(a.error()).toBe('');
  });

  it('exhaust ignores a run while another is in flight', () => {
    const subj = new Subject<number>();
    const fn = vi.fn(() => subj);
    const a = make(fn);
    a.run();
    a.run();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('switch cancels the previous run', () => {
    const subjects = [new Subject<number>(), new Subject<number>()];
    let i = 0;
    const onSuccess = vi.fn();
    const a = make(() => subjects[i++], { concurrency: 'switch', onSuccess });
    a.run();
    a.run();
    subjects[0].next(1);
    expect(onSuccess).not.toHaveBeenCalled();
    subjects[1].next(2);
    expect(onSuccess).toHaveBeenCalledWith(2);
  });

  it('merge runs all and stays pending until the last ends', () => {
    const subjects = [new Subject<number>(), new Subject<number>()];
    let i = 0;
    const a = make(() => subjects[i++], { concurrency: 'merge' });
    a.run();
    a.run();
    subjects[0].complete();
    expect(a.pending()).toBe(true);
    subjects[1].complete();
    expect(a.pending()).toBe(false);
  });

  it('is cancelled when the owner is destroyed', () => {
    const subj = new Subject<number>();
    const onSuccess = vi.fn();
    const a = make(() => subj, { onSuccess });
    a.run();
    TestBed.resetTestingModule();
    subj.next(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(subj.observed).toBe(false);
  });
});
