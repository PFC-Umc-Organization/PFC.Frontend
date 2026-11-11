import { Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, combineLatest, finalize, of, startWith, switchMap, tap } from 'rxjs';

export interface Loadable<T> {
  readonly value: Signal<T>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<string>;
  reload(): void;
}

/**
 * A reloadable read. Needs an injection context, like `toSignal`.
 * A null/undefined `params` does not call `source`: `value` is `initial`.
 * A failure fills `error` and `value` falls back to `initial`.
 */
export function loadable<T, P = void>(opts: {
  source: (params: P) => Observable<T>;
  params?: Signal<P | null | undefined>;
  initial: T;
}): Loadable<T> {
  // Starts true so the first frame never shows an empty list as a result; a null `params` turns it off.
  const loading = signal(true);
  const error = signal('');
  const reload$ = new Subject<void>();
  const params$ = toObservable(opts.params ?? (signal(undefined) as Signal<P | null | undefined>));

  const value = toSignal(
    combineLatest([params$, reload$.pipe(startWith(undefined))]).pipe(
      switchMap(([params]) => {
        error.set('');
        if (opts.params && (params === null || params === undefined)) {
          loading.set(false);
          return of(opts.initial);
        }
        loading.set(true);
        return opts.source(params as P).pipe(
          // Some services keep a live stream open after the first answer: loading ends there, not on complete.
          tap(() => loading.set(false)),
          catchError((e: unknown) => {
            error.set((e as Error)?.message || 'Erro ao carregar.');
            return of(opts.initial);
          }),
          finalize(() => loading.set(false)),
        );
      }),
    ),
    { initialValue: opts.initial },
  );

  return {
    value,
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    reload: () => reload$.next(),
  };
}
