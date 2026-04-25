import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard';

type MockRequest = {
  path: string;
  headers: Record<string, string | undefined>;
  user?: unknown;
};

const createContext = (request: MockRequest) =>
  ({
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as any;

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let jwtService: JwtService;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    jwtService = {
      verifyAsync: vi.fn(),
    } as unknown as JwtService;
    guard = new JwtAuthGuard(reflector, jwtService);
    process.env.JWT_SECRET_KEY = 'test-secret';
  });

  it('returns true for public route metadata', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);

    const request: MockRequest = { path: '/private', headers: {} };
    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('returns true for /doc path without token', async () => {
    const request: MockRequest = { path: '/doc', headers: {} };

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws when bearer token is missing', () => {
    const request: MockRequest = { path: '/user', headers: {} };

    expect(() => guard.canActivate(createContext(request))).toThrow(
      UnauthorizedException,
    );
  });

  it('attaches payload to request.user for valid token', async () => {
    const request: MockRequest = {
      path: '/user',
      headers: { authorization: 'Bearer valid-token' },
    };
    const payload = { sub: 'u-1', role: 'ADMIN' };
    vi.mocked(jwtService.verifyAsync).mockResolvedValue(payload);

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(request.user).toEqual(payload);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: 'test-secret',
    });
  });

  it('throws when token verification fails', async () => {
    const request: MockRequest = {
      path: '/user',
      headers: { authorization: 'Bearer invalid-token' },
    };
    vi.mocked(jwtService.verifyAsync).mockRejectedValue(new Error('invalid'));

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
