import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, number[]>();
  private readonly windowMs = Number.parseInt(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS || '60000',
    10,
  );
  private readonly maxRequests = Number.parseInt(
    process.env.AUTH_RATE_LIMIT_MAX || '100',
    10,
  );

  canActivate(context: ExecutionContext): boolean {
    if (process.env.TEST_MODE === 'auth') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || 'unknown';
    const key = `${request.path}:${ip}`;
    const now = Date.now();
    const threshold = now - this.windowMs;
    const history = (this.attempts.get(key) ?? []).filter(
      (ts) => ts > threshold,
    );

    if (history.length >= this.maxRequests) {
      throw new HttpException(
        'Too many auth attempts, try later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    history.push(now);
    this.attempts.set(key, history);
    return true;
  }
}
