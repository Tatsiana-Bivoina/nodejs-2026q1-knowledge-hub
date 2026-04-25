import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../user/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findRecordById: ReturnType<typeof vi.fn>;
    validatePassword: ReturnType<typeof vi.fn>;
  };
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let prisma: {
    revokedRefreshToken: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    usersService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findRecordById: vi.fn(),
      validatePassword: vi.fn(),
    };
    jwtService = {
      signAsync: vi.fn(),
      verifyAsync: vi.fn(),
    };
    prisma = {
      revokedRefreshToken: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: PrismaService, useValue: prisma },
        {
          provide: AuthService,
          useFactory: (
            users: UsersService,
            jwt: JwtService,
            prismaService: PrismaService,
          ) => new AuthService(users, jwt, prismaService),
          inject: [UsersService, JwtService, PrismaService],
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    process.env.JWT_SECRET_KEY = 'access-secret';
    process.env.JWT_SECRET_REFRESH_KEY = 'refresh-secret';
  });

  it('signup creates viewer user', async () => {
    usersService.create.mockResolvedValue({ id: 'u1', login: 'john' });

    await service.signup({ login: 'john', password: 'secret' });

    expect(usersService.create).toHaveBeenCalledWith({
      login: 'john',
      password: 'secret',
      role: UserRole.VIEWER,
    });
  });

  it('login throws when user not found', async () => {
    usersService.findAll.mockResolvedValue([]);

    await expect(
      service.login({ login: 'missing', password: 'p' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('login signs tokens for valid credentials', async () => {
    usersService.findAll.mockResolvedValue([
      { id: 'u1', login: 'john', role: UserRole.EDITOR },
    ]);
    usersService.findRecordById.mockResolvedValue({ id: 'u1', passwordHash: 'h' });
    usersService.validatePassword.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValueOnce('access').mockResolvedValueOnce('refresh');

    const result = await service.login({ login: 'john', password: 'ok' });

    expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
  });

  it('refresh throws UnauthorizedException when token is empty', async () => {
    await expect(service.refresh({ refreshToken: '' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refresh throws ForbiddenException for revoked token', async () => {
    prisma.revokedRefreshToken.findUnique.mockResolvedValue({ token: 'revoked' });

    await expect(service.refresh({ refreshToken: 'revoked' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refresh verifies token and re-signs', async () => {
    prisma.revokedRefreshToken.findUnique.mockResolvedValue(null);
    jwtService.verifyAsync.mockResolvedValue({
      userId: 'u1',
      sub: 'u1',
      login: 'john',
      role: UserRole.ADMIN,
    });
    jwtService.signAsync.mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh');

    const result = await service.refresh({ refreshToken: 'r1' });

    expect(result).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('r1', {
      secret: 'refresh-secret',
    });
  });

  it('refresh throws ForbiddenException for tampered/expired token', async () => {
    prisma.revokedRefreshToken.findUnique.mockResolvedValue(null);
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(service.refresh({ refreshToken: 'broken' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('logout stores refresh token in revoke list', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      userId: 'u1',
      sub: 'u1',
      login: 'john',
      role: UserRole.EDITOR,
    });

    await service.logout({ refreshToken: 'refresh-token' });

    expect(prisma.revokedRefreshToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'refresh-token' },
        create: expect.objectContaining({
          token: 'refresh-token',
          userId: 'u1',
        }),
      }),
    );
  });
});
