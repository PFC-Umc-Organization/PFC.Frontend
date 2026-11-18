import { Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, combineLatest, finalize, startWith, switchMap, tap } from 'rxjs';

// Tipo
export interface Loadable<T> {
  readonly value: Signal<T>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<string>;
  reload(): void;
}

// Carregamento
export function loadable<T, P = void>(opts: {
  source: (params: P) => Observable<T>;
  params?: Signal<P | null | undefined>;
  initial: T;
}): Loadable<T> {
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
          tap((v) => {
            error.set('');
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
