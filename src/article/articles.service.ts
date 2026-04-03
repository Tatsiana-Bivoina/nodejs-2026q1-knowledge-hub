import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService, ArticleRecord } from '../database/storage.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleFilterQueryDto } from './dto/article-filter.query.dto';
import { ArticleStatus } from '../common/enums/article-status.enum';

@Injectable()
export class ArticlesService {
  constructor(private readonly storage: StorageService) {}

  private ensureAuthorRef(authorId: string | null | undefined): void {
    if (authorId) {
      if (!this.storage.users.has(authorId)) {
        throw new BadRequestException();
      }
    }
  }

  private ensureCategoryRef(categoryId: string | null | undefined): void {
    if (categoryId) {
      if (!this.storage.categories.has(categoryId)) {
        throw new BadRequestException();
      }
    }
  }

  findAll(query: ArticleFilterQueryDto): ArticleRecord[] {
    let list = [...this.storage.articles.values()];
    if (query.status !== undefined) {
      list = list.filter((a) => a.status === query.status);
    }
    if (query.categoryId !== undefined) {
      list = list.filter((a) => a.categoryId === query.categoryId);
    }
    if (query.tag !== undefined) {
      list = list.filter((a) => a.tags.includes(query.tag));
    }
    return list;
  }

  findOne(id: string): ArticleRecord {
    const a = this.storage.articles.get(id);
    if (!a) {
      throw new NotFoundException();
    }
    return a;
  }

  create(dto: CreateArticleDto): ArticleRecord {
    this.ensureAuthorRef(dto.authorId ?? null);
    this.ensureCategoryRef(dto.categoryId ?? null);
    const now = Date.now();
    const article: ArticleRecord = {
      id: randomUUID(),
      title: dto.title,
      content: dto.content,
      status: dto.status,
      authorId: dto.authorId ?? null,
      categoryId: dto.categoryId ?? null,
      tags: dto.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.storage.articles.set(article.id, article);
    return article;
  }

  update(id: string, dto: UpdateArticleDto): ArticleRecord {
    const article = this.findOne(id);
    const nextAuthor =
      dto.authorId !== undefined ? dto.authorId : article.authorId;
    const nextCategory =
      dto.categoryId !== undefined ? dto.categoryId : article.categoryId;
    this.ensureAuthorRef(nextAuthor);
    this.ensureCategoryRef(nextCategory);

    if (dto.title !== undefined) {
      article.title = dto.title;
    }
    if (dto.content !== undefined) {
      article.content = dto.content;
    }
    if (dto.status !== undefined) {
      article.status = dto.status as ArticleStatus;
    }
    if (dto.authorId !== undefined) {
      article.authorId = dto.authorId;
    }
    if (dto.categoryId !== undefined) {
      article.categoryId = dto.categoryId;
    }
    if (dto.tags !== undefined) {
      article.tags = dto.tags;
    }
    article.updatedAt = Date.now();
    return article;
  }

  remove(id: string): void {
    if (!this.storage.articles.has(id)) {
      throw new NotFoundException();
    }
    this.storage.deleteCommentsByArticle(id);
    this.storage.articles.delete(id);
  }
}
