import { UserRole } from '../common/enums/user-role.enum';
import { ArticleStatus } from '../common/enums/article-status.enum';

/** API-facing user shape stored in DB via Prisma (`password` column maps to passwordHash here). */
export type UserRecord = {
  id: string;
  login: string;
  passwordHash: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
};

export type CategoryRecord = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
};

export type ArticleRecord = {
  id: string;
  title: string;
  content: string;
  status: ArticleStatus;
  authorId: string | null;
  categoryId: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type CommentRecord = {
  id: string;
  content: string;
  articleId: string;
  authorId: string | null;
  createdAt: number;
};
