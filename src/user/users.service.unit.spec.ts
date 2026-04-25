import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import * as bcrypt from 'bcrypt';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

const bcryptHashMock = bcrypt.hash as unknown as Mock;
const bcryptCompareMock = bcrypt.compare as unknown as Mock;

type UserRow = {
  id: string;
  login: string;
  password: string;
  role: PrismaUserRole;
  createdAt: Date;
  updatedAt: Date;
};

const makeRow = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'u-1',
  login: 'john',
  password: 'hash',
  role: PrismaUserRole.VIEWER,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    article: { updateMany: ReturnType<typeof vi.fn> };
    comment: { deleteMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      article: { updateMany: vi.fn() },
      comment: { deleteMany: vi.fn() },
      $transaction: vi.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: UsersService,
          useFactory: (prisma: PrismaService) => new UsersService(prisma),
          inject: [PrismaService],
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    process.env.CRYPT_SALT = '10';
  });

  it('creates user with viewer role by default', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    bcryptHashMock.mockResolvedValue('hashed');
    prismaMock.user.create.mockResolvedValue(
      makeRow({ password: 'hashed', role: PrismaUserRole.VIEWER }),
    );

    const result = await service.create({ login: 'john', password: 'secret' });

    expect(result).toMatchObject({ login: 'john', role: UserRole.VIEWER });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        login: 'john',
        password: 'hashed',
        role: PrismaUserRole.VIEWER,
      },
    });
  });

  it('throws ConflictException when login exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeRow());

    await expect(
      service.create({ login: 'john', password: 'secret' }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws ForbiddenException on wrong old password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeRow({ password: 'stored' }));
    bcryptCompareMock.mockResolvedValue(false);

    await expect(
      service.updatePassword('u-1', {
        oldPassword: 'wrong',
        newPassword: 'new-secret',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('updates password when old password is valid', async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeRow({ password: 'stored' }));
    bcryptCompareMock.mockResolvedValue(true);
    bcryptHashMock.mockResolvedValue('new-hash');
    prismaMock.user.update.mockResolvedValue(makeRow({ password: 'new-hash' }));

    const result = await service.updatePassword('u-1', {
      oldPassword: 'old',
      newPassword: 'new',
    });

    expect(result.id).toBe('u-1');
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u-1' },
      data: { password: 'new-hash' },
    });
  });

  it('throws NotFoundException when updateRole target missing', async () => {
    prismaMock.user.update.mockRejectedValue(new Error('missing'));

    await expect(service.updateRole('missing', UserRole.ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });
});
