import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { StripPasswordInterceptor } from './strip-password.interceptor';

describe('StripPasswordInterceptor', () => {
  const interceptor = new StripPasswordInterceptor();

  it('removes password fields from object', async () => {
    const stream = interceptor.intercept({} as any, {
      handle: () =>
        of({
          id: 'u1',
          login: 'john',
          password: 'secret',
          passwordHash: 'hash',
        }),
    } as any);

    await new Promise<void>((resolve) => {
      stream.subscribe((value) => {
        expect(value).toEqual({ id: 'u1', login: 'john' });
        resolve();
      });
    });
  });

  it('removes password fields from array', async () => {
    const stream = interceptor.intercept({} as any, {
      handle: () =>
        of([
          { id: 'u1', password: 'x' },
          { id: 'u2', passwordHash: 'y' },
        ]),
    } as any);

    await new Promise<void>((resolve) => {
      stream.subscribe((value) => {
        expect(value).toEqual([{ id: 'u1' }, { id: 'u2' }]);
        resolve();
      });
    });
  });
});
