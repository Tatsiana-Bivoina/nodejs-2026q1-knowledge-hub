import {
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, ValidationError } from '../common/errors/http-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CommentsService } from './comments.service';

const commentRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'cm1',
  content: 'Text',
  articleId: 'a1',
  authorId: 'u1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('CommentsService', () => {
  let service: CommentsService;
  let prisma: {
    comment: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    article: { findUnique: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      comment: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      article: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: prisma },
        {
          provide: CommentsService,
          useFactory: (prismaService: PrismaService) =>
            new CommentsService(prismaService),
          inject: [PrismaService],
        },
      ],
    }).compile();

    service = moduleRef.get(CommentsService);
  });

  it('findByArticle returns mapped list', async () => {
    prisma.comment.findMany.mockResolvedValue([commentRow()]);

    const result = await service.findByArticle('a1');

    expect(result).toHaveLength(1);
    expect(prisma.comment.findMany).toHaveBeenCalledWith({
      where: { articleId: 'a1' },
    });
  });

  it('findAuthorId throws for missing comment', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);
    await expect(service.findAuthorId('missing')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('create throws when article is missing', async () => {
    prisma.article.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ content: 'C', articleId: 'missing' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('create throws when provided author is missing', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 'a1' });
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ content: 'C', articleId: 'a1', authorId: 'missing' }),
    ).rejects.toThrow(ValidationError);
  });

  it('create persists comment when dependencies are valid', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 'a1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.comment.create.mockResolvedValue(commentRow());

    const result = await service.create({
      content: 'C',
      articleId: 'a1',
      authorId: 'u1',
    });

    expect(result.id).toBe('cm1');
    expect(prisma.comment.create).toHaveBeenCalled();
  });

  it('remove maps prisma error to NotFoundException', async () => {
    prisma.comment.delete.mockRejectedValue(new Error('missing'));
    await expect(service.remove('missing')).rejects.toThrow(NotFoundError);
  });

  it('findOne returns mapped comment', async () => {
    prisma.comment.findUnique.mockResolvedValue(commentRow());
    const result = await service.findOne('cm1');
    expect(result.id).toBe('cm1');
  });

  it('findAuthorId returns author id for existing comment', async () => {
    prisma.comment.findUnique.mockResolvedValue({ authorId: 'u1' });
    await expect(service.findAuthorId('cm1')).resolves.toBe('u1');
  });

  it('remove succeeds for existing comment', async () => {
    prisma.comment.delete.mockResolvedValue({});
    await expect(service.remove('cm1')).resolves.toBeUndefined();
  });
});
