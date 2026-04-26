import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../logging/app-logger';
import { sanitizeLogData } from '../logging/sanitize-log-data';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = this.appLogger.child('HTTP');

  constructor(private readonly appLogger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();
    this.logger.log({
      message: 'Incoming request',
      method: req.method,
      url: req.originalUrl,
      query: sanitizeLogData(req.query),
      body: sanitizeLogData(req.body),
    });

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      this.logger.log({
        message: 'Outgoing response',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTimeMs: Number(durationMs.toFixed(2)),
      });
    });

    next();
  }
}
