import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser, AuthenticatedRequest } from '../types/auth-user.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
