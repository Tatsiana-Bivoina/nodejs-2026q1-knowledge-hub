import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

type AccessTokenPayload = {
  sub: string;
  login: string;
  role: string;
};

type AuthenticatedRequest = Request & {
  user?: AccessTokenPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (this.isPublicPath(request.path)) {
      return true;
    }

    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    return this.validateToken(token, request);
  }

  private isPublicPath(path: string): boolean {
    return path === '/' || path === '/doc' || path.startsWith('/doc/');
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  private async validateToken(
    token: string,
    request: AuthenticatedRequest,
  ): Promise<boolean> {
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        {
          secret: process.env.JWT_SECRET_KEY,
        },
      );
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
