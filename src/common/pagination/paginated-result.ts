export type PaginatedResult<T> = {
  total: number;
  page: number;
  limit: number;
  data: T[];
};

export function applyPagination<T>(
  items: T[],
  page?: number,
  limit?: number,
): T[] | PaginatedResult<T> {
  const usePagination = page !== undefined || limit !== undefined;
  if (!usePagination) {
    return items;
  }
  const p = page ?? 1;
  const l = limit ?? 10;
  const total = items.length;
  const start = (p - 1) * l;
  const data = items.slice(start, start + l);
  return { total, page: p, limit: l, data };
}
