import { pageCount, pageOf } from './paginator.component';

describe('paginator', () => {
  const items = Array.from({ length: 120 }, (_, i) => i + 1);

  it('counts at least one page', () => {
    expect(pageCount(0, 50)).toBe(1);
    expect(pageCount(120, 50)).toBe(3);
    expect(pageCount(200, 200)).toBe(1);
  });

  it('slices the asked page', () => {
    expect(pageOf(items, 1, 50)).toEqual(items.slice(0, 50));
    expect(pageOf(items, 3, 50)).toEqual(items.slice(100));
  });

  it('clamps a page out of range to the nearest one', () => {
    expect(pageOf(items, 9, 50)).toEqual(items.slice(100));
    expect(pageOf(items, 0, 100)).toEqual(items.slice(0, 100));
  });
});
