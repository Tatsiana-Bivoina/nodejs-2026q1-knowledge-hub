import {
  Injectable,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../user/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { PublicUser } from '../user/users.service';
import { LogoutDto } from './dto/logout.dto';
import {
  ForbiddenError,
  UnauthorizedError,
} from '../common/errors/http-errors';

type JwtPayload = {
  userId: string;
  sub: string;
  login: string;
  role: UserRole;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private accessTtl(): string {
    return (process.env.TOKEN_EXPIRE_TIME as string) || '900s';
  }

  private refreshTtl(): string {
    return (process.env.TOKEN_REFRESH_EXPIRE_TIME as string) || '604800s';
  }

  private async signTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessOptions: JwtSignOptions = {
      secret: process.env.JWT_SECRET_KEY,
      expiresIn: this.accessTtl() as any,
    };
    const refreshOptions: JwtSignOptions = {
      secret: process.env.JWT_SECRET_REFRESH_KEY,
      expiresIn: this.refreshTtl() as any,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessOptions),
      this.jwtService.signAsync(payload, refreshOptions),
    ]);
    return { accessToken, refreshToken };
  }

  async signup(dto: SignupDto): Promise<PublicUser> {
    return this.usersService.create({
      login: dto.login,
      password: dto.password,
      role: UserRole.VIEWER,
    });
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const all = await this.usersService.findAll();
    const user = all.find((u) => u.login === dto.login);
    if (!user) {
      throw new ForbiddenError('Invalid credentials');
    }
    const record = await this.usersService.findRecordById(user.id);
    const ok = await this.usersService.validatePassword(record, dto.password);
    if (!ok) {
      throw new ForbiddenError('Invalid credentials');
    }
    const payload: JwtPayload = {
      userId: user.id,
      sub: user.id,
      login: user.login,
      role: user.role,
    };
    return this.signTokens(payload);
  }

  async refresh(dto: RefreshDto): Promise<AuthTokens> {
    if (!dto.refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }
    try {
      const isRevoked = await this.prisma.revokedRefreshToken.findUnique({
        where: { token: dto.refreshToken },
      });
      if (isRevoked) {
        throw new ForbiddenError('Refresh token is revoked');
      }

      const decoded = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: process.env.JWT_SECRET_REFRESH_KEY,
        },
      );
      const payload: JwtPayload = {
        userId: decoded.userId,
        sub: decoded.sub,
        login: decoded.login,
        role: decoded.role,
      };
      return this.signTokens(payload);
    } catch {
      throw new ForbiddenError('Refresh token is invalid or expired');
    }
  }

  async logout(dto: LogoutDto): Promise<void> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: process.env.JWT_SECRET_REFRESH_KEY,
        },
      );
    } catch {
      throw new ForbiddenError('Refresh token is invalid or expired');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.revokedRefreshToken.upsert({
      where: { token: dto.refreshToken },
      update: {},
      create: {
        token: dto.refreshToken,
        userId: payload.userId,
        expiresAt,
      },
    });
  }
}
