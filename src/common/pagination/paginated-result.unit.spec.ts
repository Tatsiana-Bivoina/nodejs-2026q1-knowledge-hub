import { describe, expect, it } from 'vitest';
import { applyPagination } from './paginated-result';

describe('applyPagination', () => {
  const items = [1, 2, 3, 4, 5];

  it('returns original array when pagination params are absent', () => {
    const result = applyPagination(items);
    expect(result).toBe(items);
  });

  it('returns paginated shape when page/limit is set', () => {
    const result = applyPagination(items, 2, 2);
    expect(result).toEqual({
      total: 5,
      page: 2,
      limit: 2,
      data: [3, 4],
    });
  });

  it('uses default values when only page is provided', () => {
    const result = applyPagination(items, 1);
    expect(result).toEqual({
      total: 5,
      page: 1,
      limit: 10,
      data: [1, 2, 3, 4, 5],
    });
  });
});
