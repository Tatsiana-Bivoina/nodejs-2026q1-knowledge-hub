import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

type RateLimitBucket = {
  count: number;
  resetAtMs: number;
};

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly windowMs = 60_000;
  private readonly maxRpm = this.resolveMaxRpm();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const now = Date.now();
    const key = this.resolveClientKey(req);
    const current = this.buckets.get(key);

    if (!current || current.resetAtMs <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAtMs: now + this.windowMs,
      });
      return true;
    }

    if (current.count >= this.maxRpm) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((current.resetAtMs - now) / 1000),
      );
      res.setHeader('Retry-After', String(retryAfterSec));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `AI rate limit exceeded. Retry in ${retryAfterSec}s.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    return true;
  }

  private resolveMaxRpm(): number {
    const raw = process.env.AI_RATE_LIMIT_RPM || '20';
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
  }

  private resolveClientKey(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return `ip:${forwarded.split(',')[0].trim()}`;
    }
    return `ip:${req.ip || 'unknown'}`;
  }
}
