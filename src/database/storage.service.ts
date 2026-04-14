import { Injectable } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { ArticleStatus } from '../common/enums/article-status.enum';

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

@Injectable()
export class StorageService {
  readonly users = new Map<string, UserRecord>();
  readonly categories = new Map<string, CategoryRecord>();
  readonly articles = new Map<string, ArticleRecord>();
  readonly comments = new Map<string, CommentRecord>();

  findUserByLogin(login: string): UserRecord | undefined {
    return [...this.users.values()].find((u) => u.login === login);
  }

  nullifyArticleAuthor(userId: string): void {
    for (const a of this.articles.values()) {
      if (a.authorId === userId) {
        a.authorId = null;
        a.updatedAt = Date.now();
      }
    }
  }

  nullifyArticleCategory(categoryId: string): void {
    for (const a of this.articles.values()) {
      if (a.categoryId === categoryId) {
        a.categoryId = null;
        a.updatedAt = Date.now();
      }
    }
  }

  deleteCommentsByArticle(articleId: string): void {
    for (const [id, c] of this.comments) {
      if (c.articleId === articleId) {
        this.comments.delete(id);
      }
    }
  }

  deleteCommentsByAuthor(userId: string): void {
    for (const [id, c] of this.comments) {
      if (c.authorId === userId) {
        this.comments.delete(id);
      }
    }
  }
}
