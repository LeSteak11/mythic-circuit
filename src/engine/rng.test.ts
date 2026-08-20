import { describe, expect, it } from 'vitest';
import { createRng, shuffled } from './rng';

describe('createRng (mulberry32)', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    for (let i = 0; i < 1000; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('stays in [0, 1) and nextInt stays in range', () => {
    const rng = createRng(999);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      const n = rng.nextInt(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('rejects invalid nextInt bounds', () => {
    const rng = createRng(1);
    expect(() => rng.nextInt(0)).toThrow();
    expect(() => rng.nextInt(2.5)).toThrow();
  });

  it('shuffled is deterministic per seed and preserves elements', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const s1 = shuffled(items, createRng(42));
    const s2 = shuffled(items, createRng(42));
    expect(s1).toEqual(s2);
    expect([...s1].sort()).toEqual([...items].sort());
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e', 'f']); // input untouched
  });
});
