import {
  ArticleStatus as PrismaArticleStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

export function toPrismaUserRole(role: UserRole): PrismaUserRole {
  switch (role) {
    case UserRole.ADMIN:
      return PrismaUserRole.ADMIN;
    case UserRole.EDITOR:
      return PrismaUserRole.EDITOR;
    case UserRole.VIEWER:
      return PrismaUserRole.VIEWER;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function toApiUserRole(role: PrismaUserRole): UserRole {
  switch (role) {
    case PrismaUserRole.ADMIN:
      return UserRole.ADMIN;
    case PrismaUserRole.EDITOR:
      return UserRole.EDITOR;
    case PrismaUserRole.VIEWER:
      return UserRole.VIEWER;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function toPrismaArticleStatus(
  status: ArticleStatus,
): PrismaArticleStatus {
  switch (status) {
    case ArticleStatus.DRAFT:
      return PrismaArticleStatus.DRAFT;
    case ArticleStatus.PUBLISHED:
      return PrismaArticleStatus.PUBLISHED;
    case ArticleStatus.ARCHIVED:
      return PrismaArticleStatus.ARCHIVED;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function toApiArticleStatus(status: PrismaArticleStatus): ArticleStatus {
  switch (status) {
    case PrismaArticleStatus.DRAFT:
      return ArticleStatus.DRAFT;
    case PrismaArticleStatus.PUBLISHED:
      return ArticleStatus.PUBLISHED;
    case PrismaArticleStatus.ARCHIVED:
      return ArticleStatus.ARCHIVED;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
