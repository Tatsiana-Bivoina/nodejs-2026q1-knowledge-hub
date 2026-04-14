export type SortOrder = 'asc' | 'desc';

export function applySorting<T extends object>(
  items: T[],
  sortBy: string | undefined,
  order: SortOrder | undefined,
  allowed: readonly (keyof T)[],
): T[] {
  if (!sortBy || allowed.length === 0) {
    return items;
  }
  const key = sortBy as keyof T;
  if (!allowed.includes(key)) {
    return items;
  }
  const dir = order === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va === vb) {
      return 0;
    }
    if (va === null || va === undefined) {
      return 1;
    }
    if (vb === null || vb === undefined) {
      return -1;
    }
    if (typeof va === 'number' && typeof vb === 'number') {
      return va < vb ? -dir : va > vb ? dir : 0;
    }
    return (
      String(va).localeCompare(String(vb), undefined, {
        sensitivity: 'base',
      }) * dir
    );
  });
}
