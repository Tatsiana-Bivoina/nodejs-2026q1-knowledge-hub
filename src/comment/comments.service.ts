import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService, CommentRecord } from '../database/storage.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly storage: StorageService) {}

  findByArticle(articleId: string): CommentRecord[] {
    return [...this.storage.comments.values()].filter(
      (c) => c.articleId === articleId,
    );
  }

  findOne(id: string): CommentRecord {
    const comment = this.storage.comments.get(id);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  create(dto: CreateCommentDto): CommentRecord {
    if (!this.storage.articles.has(dto.articleId)) {
      throw new UnprocessableEntityException('Article not found');
    }
    const authorId = dto.authorId ?? null;
    if (authorId && !this.storage.users.has(authorId)) {
      throw new BadRequestException();
    }
    const now = Date.now();
    const comment: CommentRecord = {
      id: randomUUID(),
      content: dto.content,
      articleId: dto.articleId,
      authorId,
      createdAt: now,
    };
    this.storage.comments.set(comment.id, comment);
    return comment;
  }

  remove(id: string): void {
    if (!this.storage.comments.has(id)) {
      throw new NotFoundException('Comment not found');
    }
    this.storage.comments.delete(id);
  }
}
