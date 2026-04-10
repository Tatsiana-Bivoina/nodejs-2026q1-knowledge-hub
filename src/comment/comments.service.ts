import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommentRecord } from '../database/storage.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: {
    id: string;
    content: string;
    articleId: string;
    authorId: string | null;
    createdAt: Date;
  }): CommentRecord {
    return {
      id: row.id,
      content: row.content,
      articleId: row.articleId,
      authorId: row.authorId,
      createdAt: row.createdAt.getTime(),
    };
  }

  async findByArticle(articleId: string): Promise<CommentRecord[]> {
    const rows = await this.prisma.comment.findMany({
      where: { articleId },
    });
    return rows.map((r) => this.toRecord(r));
  }

  async findOne(id: string): Promise<CommentRecord> {
    const row = await this.prisma.comment.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Comment not found');
    }
    return this.toRecord(row);
  }

  async create(dto: CreateCommentDto): Promise<CommentRecord> {
    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
    });
    if (!article) {
      throw new UnprocessableEntityException('Article not found');
    }
    const authorId = dto.authorId ?? null;
    if (authorId) {
      const user = await this.prisma.user.findUnique({
        where: { id: authorId },
      });
      if (!user) {
        throw new BadRequestException();
      }
    }
    const row = await this.prisma.comment.create({
      data: {
        content: dto.content,
        article: { connect: { id: dto.articleId } },
        ...(authorId ? { author: { connect: { id: authorId } } } : {}),
      },
    });
    return this.toRecord(row);
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.comment.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Comment not found');
    }
  }
}
