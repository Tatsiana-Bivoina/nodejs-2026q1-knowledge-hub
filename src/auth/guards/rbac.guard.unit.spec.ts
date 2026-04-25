import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../common/enums/user-role.enum';
import { ArticlesService } from '../../article/articles.service';
import { CommentsService } from '../../comment/comments.service';
import { RbacGuard } from './rbac.guard';

type Req = {
  path: string;
  method: string;
  user?: { sub: string; role: UserRole };
  body?: Record<string, unknown>;
  params?: Record<string, string>;
};

const makeContext = (request: Req) =>
  ({
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as any;

describe('RbacGuard', () => {
  let reflector: Reflector;
  let articlesService: { findAuthorId: ReturnType<typeof vi.fn> };
  let commentsService: { findAuthorId: ReturnType<typeof vi.fn> };
  let guard: RbacGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    articlesService = { findAuthorId: vi.fn() };
    commentsService = { findAuthorId: vi.fn() };
    guard = new RbacGuard(
      reflector,
      articlesService as unknown as ArticlesService,
      commentsService as unknown as CommentsService,
    );
  });

  it('allows public metadata route', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true);
    const result = await guard.canActivate(
      makeContext({ path: '/user', method: 'POST' }),
    );
    expect(result).toBe(true);
  });

  it('allows /doc route and GET requests', async () => {
    const docResult = await guard.canActivate(
      makeContext({ path: '/doc', method: 'POST' }),
    );
    const getResult = await guard.canActivate(
      makeContext({
        path: '/article',
        method: 'GET',
        user: { sub: 'u-1', role: UserRole.VIEWER },
      }),
    );
    expect(docResult).toBe(true);
    expect(getResult).toBe(true);
  });

  it('returns false when user is absent on protected route', async () => {
    const result = await guard.canActivate(
      makeContext({ path: '/article', method: 'POST' }),
    );
    expect(result).toBe(false);
  });

  it('allows admin on protected write route', async () => {
    const result = await guard.canActivate(
      makeContext({
        path: '/category',
        method: 'POST',
        user: { sub: 'u-admin', role: UserRole.ADMIN },
      }),
    );
    expect(result).toBe(true);
  });

  it('forbids viewer on write route', async () => {
    await expect(
      guard.canActivate(
        makeContext({
          path: '/article',
          method: 'POST',
          user: { sub: 'u-viewer', role: UserRole.VIEWER },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows editor to POST own article and forbids foreign authorId', async () => {
    await expect(
      guard.canActivate(
        makeContext({
          path: '/article',
          method: 'POST',
          user: { sub: 'u-editor', role: UserRole.EDITOR },
          body: { authorId: 'another-user' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);

    const result = await guard.canActivate(
      makeContext({
        path: '/article',
        method: 'POST',
        user: { sub: 'u-editor', role: UserRole.EDITOR },
        body: { authorId: 'u-editor' },
      }),
    );
    expect(result).toBe(true);
  });

  it('checks editor article PUT ownership', async () => {
    articlesService.findAuthorId.mockResolvedValueOnce('u-editor');
    const allowed = await guard.canActivate(
      makeContext({
        path: '/article/1',
        method: 'PUT',
        params: { id: 'a-1' },
        user: { sub: 'u-editor', role: UserRole.EDITOR },
        body: { authorId: 'u-editor' },
      }),
    );
    expect(allowed).toBe(true);

    articlesService.findAuthorId.mockResolvedValueOnce('another');
    await expect(
      guard.canActivate(
        makeContext({
          path: '/article/1',
          method: 'PUT',
          params: { id: 'a-1' },
          user: { sub: 'u-editor', role: UserRole.EDITOR },
          body: {},
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('always forbids editor DELETE comment (even own)', async () => {
    commentsService.findAuthorId.mockResolvedValue('u-editor');
    await expect(
      guard.canActivate(
        makeContext({
          path: '/comment/1',
          method: 'DELETE',
          params: { id: 'c-1' },
          user: { sub: 'u-editor', role: UserRole.EDITOR },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forbids editor DELETE comment when author differs', async () => {
    commentsService.findAuthorId.mockResolvedValue('another-user');
    await expect(
      guard.canActivate(
        makeContext({
          path: '/comment/1',
          method: 'DELETE',
          params: { id: 'c-1' },
          user: { sub: 'u-editor', role: UserRole.EDITOR },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forbids editor on category and user paths', async () => {
    await expect(
      guard.canActivate(
        makeContext({
          path: '/category',
          method: 'POST',
          user: { sub: 'u-editor', role: UserRole.EDITOR },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      guard.canActivate(
        makeContext({
          path: '/user',
          method: 'DELETE',
          user: { sub: 'u-editor', role: UserRole.EDITOR },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forbids editor comment PUT and unknown paths', async () => {
    await expect(
      guard.canActivate(
        makeContext({
          path: '/comment/1',
          method: 'PUT',
          user: { sub: 'u-editor', role: UserRole.EDITOR },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      guard.canActivate(
        makeContext({
          path: '/unknown',
          method: 'POST',
          user: { sub: 'u-editor', role: UserRole.EDITOR },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forbids article PUT when next author is null', async () => {
    articlesService.findAuthorId.mockResolvedValue('u-editor');
    await expect(
      guard.canActivate(
        makeContext({
          path: '/article/1',
          method: 'PUT',
          params: { id: 'a-1' },
          user: { sub: 'u-editor', role: UserRole.EDITOR },
          body: { authorId: null },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
