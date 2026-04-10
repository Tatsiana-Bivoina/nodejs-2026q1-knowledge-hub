import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  toApiArticleStatus,
  toPrismaArticleStatus,
} from '../database/prisma-enums';
import { ArticleRecord } from '../database/storage.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleFilterQueryDto } from './dto/article-filter.query.dto';
import { ArticleStatus } from '../common/enums/article-status.enum';

type ArticleWithTags = Prisma.ArticleGetPayload<{ include: { tags: true } }>;

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: ArticleWithTags): ArticleRecord {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      status: toApiArticleStatus(row.status),
      authorId: row.authorId,
      categoryId: row.categoryId,
      tags: row.tags.map((t) => t.name),
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    };
  }

  private async ensureAuthorRef(
    authorId: string | null | undefined,
  ): Promise<void> {
    if (authorId) {
      const user = await this.prisma.user.findUnique({
        where: { id: authorId },
      });
      if (!user) {
        throw new BadRequestException();
      }
    }
  }

  private async ensureCategoryRef(
    categoryId: string | null | undefined,
  ): Promise<void> {
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new BadRequestException();
      }
    }
  }

  async findAll(
    query: Pick<ArticleFilterQueryDto, 'status' | 'categoryId' | 'tag'>,
  ): Promise<ArticleRecord[]> {
    const where: Prisma.ArticleWhereInput = {};
    if (query.status !== undefined) {
      where.status = toPrismaArticleStatus(query.status);
    }
    if (query.categoryId !== undefined) {
      where.categoryId = query.categoryId;
    }
    if (query.tag !== undefined) {
      where.tags = { some: { name: query.tag } };
    }
    const rows = await this.prisma.article.findMany({
      where,
      include: { tags: true },
    });
    return rows.map((r) => this.toRecord(r));
  }

  async findOne(id: string): Promise<ArticleRecord> {
    const row = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!row) {
      throw new NotFoundException();
    }
    return this.toRecord(row);
  }

  async create(dto: CreateArticleDto): Promise<ArticleRecord> {
    await this.ensureAuthorRef(dto.authorId ?? null);
    await this.ensureCategoryRef(dto.categoryId ?? null);
    const row = await this.prisma.article.create({
      data: {
        title: dto.title,
        content: dto.content,
        status: toPrismaArticleStatus(dto.status),
        ...(dto.authorId ? { author: { connect: { id: dto.authorId } } } : {}),
        ...(dto.categoryId
          ? { category: { connect: { id: dto.categoryId } } }
          : {}),
        ...(dto.tags?.length
          ? {
              tags: {
                connectOrCreate: dto.tags.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              },
            }
          : {}),
      },
      include: { tags: true },
    });
    return this.toRecord(row);
  }

  async update(id: string, dto: UpdateArticleDto): Promise<ArticleRecord> {
    const current = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (!current) {
      throw new NotFoundException();
    }
    const nextAuthor =
      dto.authorId !== undefined ? dto.authorId : current.authorId;
    const nextCategory =
      dto.categoryId !== undefined ? dto.categoryId : current.categoryId;
    await this.ensureAuthorRef(nextAuthor);
    await this.ensureCategoryRef(nextCategory);

    const data: Prisma.ArticleUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = dto.title;
    }
    if (dto.content !== undefined) {
      data.content = dto.content;
    }
    if (dto.status !== undefined) {
      data.status = toPrismaArticleStatus(dto.status as ArticleStatus);
    }
    if (dto.authorId !== undefined) {
      data.author = dto.authorId
        ? { connect: { id: dto.authorId } }
        : { disconnect: true };
    }
    if (dto.categoryId !== undefined) {
      data.category = dto.categoryId
        ? { connect: { id: dto.categoryId } }
        : { disconnect: true };
    }
    if (dto.tags !== undefined) {
      const upserted = await Promise.all(
        dto.tags.map((name) =>
          this.prisma.tag.upsert({
            where: { name },
            create: { name },
            update: {},
          }),
        ),
      );
      data.tags = { set: upserted.map((t) => ({ id: t.id })) };
    }

    const row = await this.prisma.article.update({
      where: { id },
      data,
      include: { tags: true },
    });
    return this.toRecord(row);
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.article.delete({ where: { id } });
    } catch {
      throw new NotFoundException();
    }
  }
}
