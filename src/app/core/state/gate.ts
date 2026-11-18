import { Observable, Subscription } from 'rxjs';

// ---------------------------------------------------------------------------
// Concorrência
// ---------------------------------------------------------------------------

export class Gate {
  private active = 0;
  private queue: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  // Execução
  run<T>(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => {
      let inner: Subscription | undefined;
      let started = false;
      let released = false;

      const release = () => {
        if (started && !released) {
          released = true;
          this.active--;
          this.drain();
        }
      };
      const start = () => {
        started = true;
        this.active++;
        inner = source.subscribe({
          next: (value) => {
            subscriber.next(value);
            release();
          },
          error: (error) => {
            release();
            subscriber.error(error);
          },
          complete: () => {
            release();
            subscriber.complete();
          },
        });
      };

      if (this.active < this.limit) {
        start();
      } else {
        this.queue.push(start);
      }
      return () => {
        inner?.unsubscribe();
        release();
        this.queue = this.queue.filter((q) => q !== start);
      };
    });
  }

  // Fila
  private drain(): void {
    while (this.active < this.limit && this.queue.length) {
      this.queue.shift()!();
    }
  }
}
