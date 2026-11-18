import { DestroyRef, Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, defer, exhaustMap, finalize, mergeMap, switchMap, tap, EMPTY } from 'rxjs';

// Ação
export interface Action<A extends unknown[]> {
  readonly pending: Signal<boolean>;
  readonly error: Signal<string>;
  run(...args: A): void;
}

// Opções
export interface ActionOptions<A extends unknown[], R> {
  onSuccess?: (result: R, ...args: A) => void;
  onError?: (error: Error, ...args: A) => void;
  concurrency?: 'exhaust' | 'switch' | 'merge';
}

// Fábrica
export function action<A extends unknown[], R>(
  fn: (...args: A) => Observable<R>,
  opts: ActionOptions<A, R> = {},
): Action<A> {
  const pendingCount = signal(0);
  const pending = signal(false);
  const error = signal('');
  const runs$ = new Subject<A>();
  const flatten: typeof mergeMap = { exhaust: exhaustMap, switch: switchMap, merge: mergeMap }[opts.concurrency ?? 'exhaust'] as typeof mergeMap;

  runs$
    .pipe(
      flatten((args: A) => {
        error.set('');
        pendingCount.update((n) => n + 1);
        pending.set(true);
        return defer(() => fn(...args)).pipe(
          tap((result) => opts.onSuccess?.(result, ...args)),
          catchError((e: unknown) => {
            const err = e instanceof Error ? e : new Error(String(e));
            error.set(err.message);
            opts.onError?.(err, ...args);
            return EMPTY;
          }),
          finalize(() => {
            pendingCount.update((n) => n - 1);
            pending.set(pendingCount() > 0);
          }),
        );
      }),
      takeUntilDestroyed(inject(DestroyRef)),
    )
    .subscribe();

  return { pending: pending.asReadonly(), error: error.asReadonly(), run: (...args: A) => runs$.next(args) };
}
