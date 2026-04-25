import { describe, expect, it } from 'vitest';
import { applySorting } from './apply-sorting';

type Item = {
  id: string;
  name: string | null;
  score: number | null;
};

describe('applySorting', () => {
  const items: Item[] = [
    { id: '1', name: 'Bravo', score: 20 },
    { id: '2', name: 'alpha', score: 30 },
    { id: '3', name: null, score: null },
  ];

  it('returns same reference when sortBy is missing', () => {
    const result = applySorting(items, undefined, 'asc', ['name']);
    expect(result).toBe(items);
  });

  it('returns same reference when sort key is not allowed', () => {
    const result = applySorting(items, 'score', 'asc', ['name']);
    expect(result).toBe(items);
  });

  it('sorts strings case-insensitively in ascending order', () => {
    const result = applySorting(items, 'name', 'asc', ['name', 'score']);
    expect(result.map((i) => i.id)).toEqual(['2', '1', '3']);
  });

  it('sorts numbers in descending order', () => {
    const result = applySorting(items, 'score', 'desc', ['name', 'score']);
    expect(result.map((i) => i.id)).toEqual(['2', '1', '3']);
  });

  it('keeps stable result for equal values', () => {
    const equalItems: Item[] = [
      { id: '1', name: 'same', score: 1 },
      { id: '2', name: 'same', score: 1 },
    ];
    const result = applySorting(equalItems, 'name', 'asc', ['name']);
    expect(result.map((i) => i.id)).toEqual(['1', '2']);
  });

  it('puts undefined-like values last', () => {
    const withNulls: Item[] = [
      { id: '1', name: null, score: null },
      { id: '2', name: 'a', score: 2 },
      { id: '3', name: 'b', score: 1 },
    ];
    const result = applySorting(withNulls, 'name', 'asc', ['name']);
    expect(result.map((i) => i.id)).toEqual(['2', '3', '1']);
  });
});
