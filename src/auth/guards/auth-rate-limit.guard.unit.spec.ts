import { HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

type MockRequest = {
  path: string;
  ip?: string;
};

const createContext = (request: MockRequest) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as any;

describe('AuthRateLimitGuard', () => {
  it('allows requests when TEST_MODE=auth', () => {
    process.env.TEST_MODE = 'auth';
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_RATE_LIMIT_MAX = '1';

    const guard = new AuthRateLimitGuard();
    const result = guard.canActivate(createContext({ path: '/auth/login' }));

    expect(result).toBe(true);
    delete process.env.TEST_MODE;
  });

  it('throws TOO_MANY_REQUESTS after max requests reached', () => {
    delete process.env.TEST_MODE;
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_RATE_LIMIT_MAX = '1';

    const guard = new AuthRateLimitGuard();
    const context = createContext({ path: '/auth/login', ip: '127.0.0.1' });

    expect(guard.canActivate(context)).toBe(true);

    try {
      guard.canActivate(context);
      throw new Error('expected guard to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      const httpError = error as HttpException;
      expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('uses unknown when ip is absent', () => {
    delete process.env.TEST_MODE;
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    const nowSpy = vi.spyOn(Date, 'now');

    nowSpy.mockReturnValueOnce(1).mockReturnValueOnce(2);

    const guard = new AuthRateLimitGuard();
    const context = createContext({ path: '/auth/login' });
    expect(guard.canActivate(context)).toBe(true);

    expect(() => guard.canActivate(context)).toThrow(HttpException);

    nowSpy.mockRestore();
  });
});
