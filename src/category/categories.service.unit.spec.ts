import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../common/errors/http-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

const categoryRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  name: 'Tech',
  description: 'Category',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: prisma },
        {
          provide: CategoriesService,
          useFactory: (prismaService: PrismaService) =>
            new CategoriesService(prismaService),
          inject: [PrismaService],
        },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  it('findAll maps records', async () => {
    prisma.category.findMany.mockResolvedValue([categoryRow()]);

    const result = await service.findAll();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tech');
  });

  it('findOne throws when category not found', async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundError);
  });

  it('create persists category', async () => {
    prisma.category.create.mockResolvedValue(categoryRow({ name: 'New' }));

    const result = await service.create({ name: 'New', description: 'Desc' });

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: 'New', description: 'Desc' },
    });
    expect(result.name).toBe('New');
  });

  it('update maps prisma errors to NotFoundException', async () => {
    prisma.category.update.mockRejectedValue(new Error('missing'));
    await expect(service.update('c1', { name: 'X' })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('remove maps prisma errors to NotFoundException', async () => {
    prisma.category.delete.mockRejectedValue(new Error('missing'));
    await expect(service.remove('c1')).rejects.toThrow(NotFoundError);
  });

  it('findOne returns mapped category', async () => {
    prisma.category.findUnique.mockResolvedValue(categoryRow());
    const result = await service.findOne('c1');
    expect(result.id).toBe('c1');
  });

  it('update returns updated category', async () => {
    prisma.category.update.mockResolvedValue(
      categoryRow({ name: 'Updated', description: 'D2' }),
    );
    const result = await service.update('c1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('remove succeeds for existing category', async () => {
    prisma.category.delete.mockResolvedValue({});
    await expect(service.remove('c1')).resolves.toBeUndefined();
  });
});
