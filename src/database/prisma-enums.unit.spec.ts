import {
  ArticleStatus as PrismaArticleStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import {
  toApiArticleStatus,
  toApiUserRole,
  toPrismaArticleStatus,
  toPrismaUserRole,
} from './prisma-enums';

describe('prisma-enums', () => {
  it('maps user roles to prisma and back', () => {
    expect(toPrismaUserRole(UserRole.ADMIN)).toBe(PrismaUserRole.ADMIN);
    expect(toPrismaUserRole(UserRole.EDITOR)).toBe(PrismaUserRole.EDITOR);
    expect(toPrismaUserRole(UserRole.VIEWER)).toBe(PrismaUserRole.VIEWER);

    expect(toApiUserRole(PrismaUserRole.ADMIN)).toBe(UserRole.ADMIN);
    expect(toApiUserRole(PrismaUserRole.EDITOR)).toBe(UserRole.EDITOR);
    expect(toApiUserRole(PrismaUserRole.VIEWER)).toBe(UserRole.VIEWER);
  });

  it('maps article statuses to prisma and back', () => {
    expect(toPrismaArticleStatus(ArticleStatus.DRAFT)).toBe(
      PrismaArticleStatus.DRAFT,
    );
    expect(toPrismaArticleStatus(ArticleStatus.PUBLISHED)).toBe(
      PrismaArticleStatus.PUBLISHED,
    );
    expect(toPrismaArticleStatus(ArticleStatus.ARCHIVED)).toBe(
      PrismaArticleStatus.ARCHIVED,
    );

    expect(toApiArticleStatus(PrismaArticleStatus.DRAFT)).toBe(
      ArticleStatus.DRAFT,
    );
    expect(toApiArticleStatus(PrismaArticleStatus.PUBLISHED)).toBe(
      ArticleStatus.PUBLISHED,
    );
    expect(toApiArticleStatus(PrismaArticleStatus.ARCHIVED)).toBe(
      ArticleStatus.ARCHIVED,
    );
  });

  it('handles unexpected values through exhaustive default branch', () => {
    expect(toPrismaUserRole('unexpected' as UserRole)).toBe('unexpected');
    expect(toApiUserRole('unexpected' as PrismaUserRole)).toBe('unexpected');
    expect(toPrismaArticleStatus('unexpected' as ArticleStatus)).toBe(
      'unexpected',
    );
    expect(toApiArticleStatus('unexpected' as PrismaArticleStatus)).toBe(
      'unexpected',
    );
  });
});
