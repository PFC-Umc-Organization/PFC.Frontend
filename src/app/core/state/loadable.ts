import { Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, combineLatest, finalize, startWith, switchMap, tap } from 'rxjs';

export interface Loadable<T> {
  readonly value: Signal<T>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<string>;
  reload(): void;
}

/**
 * A reloadable read. Needs an injection context, like `toSignal`.
 * A null/undefined `params` does not call `source`: `value` is `initial`.
 * A failure fills `error` and keeps the last loaded value (`initial` only if nothing loaded yet);
 * a reload or a params change keeps showing the last value until the new answer arrives.
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

  const value = signal<T>(opts.initial);
  combineLatest([params$, reload$.pipe(startWith(undefined))])
    .pipe(
      switchMap(([params]) => {
        error.set('');
        if (opts.params && (params === null || params === undefined)) {
          loading.set(false);
          value.set(opts.initial);
          return EMPTY;
        }
        loading.set(true);
        return opts.source(params as P).pipe(
          // Some services keep a live stream open after the first answer: loading ends there, not on complete.
          tap((v) => {
            value.set(v);
            loading.set(false);
          }),
          catchError((e: unknown) => {
            error.set((e as Error)?.message || 'Erro ao carregar.');
            return EMPTY;
          }),
          finalize(() => loading.set(false)),
        );
      }),
      takeUntilDestroyed(),
    )
    .subscribe();

  return {
    value: value.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    reload: () => reload$.next(),
  };
}
