import { defer, of, throwError } from 'rxjs';

import { ApiError } from '../services/http-error';
import { isTransient, retryTransient } from './retry';

const failure = (status: number): ApiError => Object.assign(new Error('falha'), { status });

// Fonte
function flaky(failures: number, status: number) {
  let calls = 0;
  const source = defer(() => (++calls <= failures ? throwError(() => failure(status)) : of('ok')));
  return { source, calls: () => calls };
}

describe('retryTransient', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('recognises transient statuses only', () => {
    expect([0, 429, 500, 502, 503, 504].every((s) => isTransient(failure(s)))).toBe(true);
    expect([400, 401, 403, 404, 409].some((s) => isTransient(failure(s)))).toBe(false);
    expect(isTransient(new Error('sem status'))).toBe(false);
  });

  it('retries twice, after 500 ms and 1200 ms, before succeeding', async () => {
    const { source, calls } = flaky(2, 503);
    const result: string[] = [];
    source.pipe(retryTransient()).subscribe((v) => result.push(v));
    expect(calls()).toBe(1);
    await vi.advanceTimersByTimeAsync(499);
    expect(calls()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls()).toBe(2);
    await vi.advanceTimersByTimeAsync(1200);
    expect(calls()).toBe(3);
    expect(result).toEqual(['ok']);
  });

  it('gives up after two retries and passes the error on', async () => {
    const { source, calls } = flaky(5, 502);
    let error: unknown;
    source.pipe(retryTransient()).subscribe({ error: (e) => (error = e) });
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls()).toBe(3);
    expect((error as ApiError).status).toBe(502);
  });

  it('does not retry a definitive error', async () => {
    const { source, calls } = flaky(5, 403);
    let error: unknown;
    source.pipe(retryTransient()).subscribe({ error: (e) => (error = e) });
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls()).toBe(1);
    expect((error as ApiError).status).toBe(403);
  });
});
