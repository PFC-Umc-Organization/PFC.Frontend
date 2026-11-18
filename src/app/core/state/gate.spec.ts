import { Observable, Subject, combineLatest, defer } from 'rxjs';

import { Gate } from './gate';

// Início
const counted = <T>(source: Observable<T>, onStart: () => void) =>
  defer(() => {
    onStart();
    return source;
  });

describe('Gate', () => {
  it('starts at most N sources at once and releases a slot on the first value', () => {
    const gate = new Gate(3);
    const subjects = Array.from({ length: 7 }, () => new Subject<number>());
    let started = 0;
    const results: number[][] = [];
    combineLatest(subjects.map((s) => gate.run(counted(s, () => started++)))).subscribe((r) => results.push(r));

    expect(started).toBe(3);
    subjects[0].next(0);
    expect(started).toBe(4);
    subjects[1].next(1);
    subjects[2].next(2);
    expect(started).toBe(6);
    subjects[3].next(3);
    subjects[4].next(4);
    subjects[5].next(5);
    expect(started).toBe(7);
    expect(results).toHaveLength(0);
    subjects[6].next(6);
    expect(results).toEqual([[0, 1, 2, 3, 4, 5, 6]]);
  });

  it('keeps delivering later values after the slot was released', () => {
    const gate = new Gate(1);
    const a = new Subject<string>();
    const seen: string[] = [];
    gate.run(a).subscribe((v) => seen.push(v));
    a.next('1');
    a.next('2');
    expect(seen).toEqual(['1', '2']);
  });

  it('frees the slot when a source is dropped before its first value', () => {
    const gate = new Gate(1);
    let secondStarted = false;
    const first = gate.run(new Subject<number>()).subscribe();
    gate.run(counted(new Subject<number>(), () => (secondStarted = true))).subscribe();
    expect(secondStarted).toBe(false);
    first.unsubscribe();
    expect(secondStarted).toBe(true);
  });

  it('releases a slot held too long by a source that never emits', () => {
    vi.useFakeTimers();
    const gate = new Gate(1, 1000);
    let secondStarted = false;
    gate.run(new Subject<number>()).subscribe();
    gate.run(counted(new Subject<number>(), () => (secondStarted = true))).subscribe();
    expect(secondStarted).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(secondStarted).toBe(true);
    vi.useRealTimers();
  });
});
