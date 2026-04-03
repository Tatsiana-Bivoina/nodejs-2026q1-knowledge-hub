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

@Injectable()
export class StorageService {
  readonly users = new Map<string, UserRecord>();
  readonly articles = new Map<string, ArticleRecord>();

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
}
