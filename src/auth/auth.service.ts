import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UsersService } from '../user/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { PublicUser } from '../user/users.service';

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
      throw new ForbiddenException();
    }
    const record = await this.usersService.findRecordById(user.id);
    const ok = await this.usersService.validatePassword(record, dto.password);
    if (!ok) {
      throw new ForbiddenException();
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
      throw new UnauthorizedException();
    }
    try {
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
      throw new ForbiddenException();
    }
  }
}
