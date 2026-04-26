import { Test, TestingModule } from '@nestjs/testing';
import { ArticleStatus as PrismaArticleStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { NotFoundError, ValidationError } from '../common/errors/http-errors';
import { PrismaService } from '../prisma/prisma.service';
import { ArticlesService } from './articles.service';

const articleRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'a1',
  title: 'Title',
  content: 'Content',
  status: PrismaArticleStatus.DRAFT,
  authorId: 'u1',
  categoryId: 'c1',
  tags: [{ id: 't1', name: 'nestjs' }],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('ArticlesService', () => {
  let service: ArticlesService;
  let prisma: {
    article: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    user: { findUnique: ReturnType<typeof vi.fn> };
    category: { findUnique: ReturnType<typeof vi.fn> };
    tag: { upsert: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      article: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      user: { findUnique: vi.fn() },
      category: { findUnique: vi.fn() },
      tag: { upsert: vi.fn() },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: prisma },
        {
          provide: ArticlesService,
          useFactory: (prismaService: PrismaService) =>
            new ArticlesService(prismaService),
          inject: [PrismaService],
        },
      ],
    }).compile();

    service = moduleRef.get(ArticlesService);
  });

  it('findAll builds prisma where from query', async () => {
    prisma.article.findMany.mockResolvedValue([articleRow()]);

    const result = await service.findAll({
      status: ArticleStatus.DRAFT,
      categoryId: 'c1',
      tag: 'nestjs',
    });

    expect(prisma.article.findMany).toHaveBeenCalledWith({
      where: {
        status: PrismaArticleStatus.DRAFT,
        categoryId: 'c1',
        tags: { some: { name: 'nestjs' } },
      },
      include: { tags: true },
    });
    expect(result).toHaveLength(1);
  });

  it('findAll uses empty where for empty filter', async () => {
    prisma.article.findMany.mockResolvedValue([]);

    await service.findAll({});

    expect(prisma.article.findMany).toHaveBeenCalledWith({
      where: {},
      include: { tags: true },
    });
  });

  it('findOne throws NotFoundException for missing article', async () => {
    prisma.article.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundError);
  });

  it('create throws BadRequestException when author does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.create({
        title: 'T',
        content: 'C',
        status: ArticleStatus.DRAFT,
        authorId: 'missing',
        categoryId: null,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('create persists tags via connectOrCreate', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.article.create.mockResolvedValue(articleRow());

    const result = await service.create({
      title: 'T',
      content: 'C',
      status: ArticleStatus.DRAFT,
      authorId: 'u1',
      categoryId: 'c1',
      tags: ['nestjs'],
    });

    expect(prisma.article.create).toHaveBeenCalled();
    expect(result.id).toBe('a1');
  });

  it('update throws NotFoundException when current article missing', async () => {
    prisma.article.findUnique.mockResolvedValue(null);
    await expect(service.update('a1', { title: 'N' })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('remove maps prisma failure to NotFoundException', async () => {
    prisma.article.delete.mockRejectedValue(new Error('missing'));
    await expect(service.remove('missing')).rejects.toThrow(NotFoundError);
  });

  it('findAuthorId throws NotFoundException for unknown article', async () => {
    prisma.article.findUnique.mockResolvedValue(null);
    await expect(service.findAuthorId('missing')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('findAuthorId returns author id for existing article', async () => {
    prisma.article.findUnique.mockResolvedValue({ authorId: 'u1' });

    await expect(service.findAuthorId('a1')).resolves.toBe('u1');
  });

  it('update writes tag set when tags are provided', async () => {
    prisma.article.findUnique.mockResolvedValueOnce(articleRow());
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.tag.upsert.mockResolvedValueOnce({ id: 't1' }).mockResolvedValueOnce({
      id: 't2',
    });
    prisma.article.update.mockResolvedValue(
      articleRow({ tags: [{ id: 't1', name: 'a' }, { id: 't2', name: 'b' }] }),
    );

    const result = await service.update('a1', {
      tags: ['a', 'b'],
      status: ArticleStatus.PUBLISHED,
    });

    expect(prisma.tag.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: expect.objectContaining({
          tags: { set: [{ id: 't1' }, { id: 't2' }] },
        }),
      }),
    );
    expect(result.tags).toEqual(['a', 'b']);
  });

  it('update throws BadRequestException when next category is invalid', async () => {
    prisma.article.findUnique.mockResolvedValueOnce(articleRow());
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(
      service.update('a1', {
        categoryId: 'missing-category',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('update disconnects author and category when null is passed', async () => {
    prisma.article.findUnique.mockResolvedValueOnce(articleRow());
    prisma.article.update.mockResolvedValue(
      articleRow({ authorId: null, categoryId: null }),
    );

    const result = await service.update('a1', {
      authorId: null,
      categoryId: null,
    });

    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: expect.objectContaining({
          author: { disconnect: true },
          category: { disconnect: true },
        }),
      }),
    );
    expect(result.authorId).toBeNull();
    expect(result.categoryId).toBeNull();
  });
});
