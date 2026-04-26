import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'fs';
import { join } from 'path';

type LevelPriority = Record<LogLevel, number>;

type LogContext = {
  context?: string;
  trace?: string;
  meta?: unknown;
};

const LEVELS: LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

const LEVEL_PRIORITY: LevelPriority = {
  fatal: 0,
  error: 1,
  warn: 2,
  log: 3,
  debug: 4,
  verbose: 5,
};

@Injectable()
export class AppLogger implements LoggerService {
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly currentLevel = this.resolveLogLevel();
  private readonly logsDir = join(process.cwd(), 'logs');
  private readonly logFilePath = join(this.logsDir, 'app.log');
  private readonly maxFileSizeBytes = this.resolveMaxFileSizeBytes();

  log(message: unknown, context?: string): void {
    this.write('log', message, { context });
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, { context, trace });
  }

  fatal(message: unknown, trace?: string, context?: string): void {
    this.write('fatal', message, { context, trace });
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, { context });
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, { context });
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, { context });
  }

  child(
    context: string,
  ): Pick<AppLogger, 'log' | 'error' | 'fatal' | 'warn' | 'debug' | 'verbose'> {
    return {
      log: (message: unknown) => this.log(message, context),
      error: (message: unknown, trace?: string) =>
        this.error(message, trace, context),
      fatal: (message: unknown, trace?: string) =>
        this.fatal(message, trace, context),
      warn: (message: unknown) => this.warn(message, context),
      debug: (message: unknown) => this.debug(message, context),
      verbose: (message: unknown) => this.verbose(message, context),
    };
  }

  private resolveLogLevel(): LogLevel {
    const value = (process.env.LOG_LEVEL || 'log').toLowerCase();
    return LEVELS.includes(value as LogLevel) ? (value as LogLevel) : 'log';
  }

  private resolveMaxFileSizeBytes(): number {
    const kb = Number.parseInt(process.env.LOG_MAX_FILE_SIZE || '1024', 10);
    const normalizedKb = Number.isFinite(kb) && kb > 0 ? kb : 1024;
    return normalizedKb * 1024;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[this.currentLevel];
  }

  private write(level: LogLevel, message: unknown, ctx: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const now = new Date();
    const line = this.isProduction
      ? this.toStructuredLine(now, level, message, ctx)
      : this.toHumanLine(now, level, message, ctx);

    if (level === 'error' || level === 'warn') {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }

    this.writeToFile(line);
  }

  private toStructuredLine(
    now: Date,
    level: LogLevel,
    message: unknown,
    ctx: LogContext,
  ): string {
    const payload: Record<string, unknown> = {
      timestamp: now.toISOString(),
      level,
      message: this.stringifyMessage(message),
    };
    if (ctx.context) {
      payload.context = ctx.context;
    }
    if (ctx.trace) {
      payload.trace = ctx.trace;
    }
    if (ctx.meta !== undefined) {
      payload.meta = ctx.meta;
    }
    return `${JSON.stringify(payload)}\n`;
  }

  private toHumanLine(
    now: Date,
    level: LogLevel,
    message: unknown,
    ctx: LogContext,
  ): string {
    const timestamp = now.toISOString();
    const context = ctx.context ? ` [${ctx.context}]` : '';
    const trace = ctx.trace ? `\n${ctx.trace}` : '';
    const meta = ctx.meta !== undefined ? ` ${this.safeStringify(ctx.meta)}` : '';
    return `${timestamp} ${level.toUpperCase()}${context} ${this.stringifyMessage(message)}${meta}${trace}\n`;
  }

  private stringifyMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }
    return this.safeStringify(message);
  }

  private safeStringify(data: unknown): string {
    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }

  private writeToFile(line: string): void {
    try {
      if (!existsSync(this.logsDir)) {
        mkdirSync(this.logsDir, { recursive: true });
      }
      this.rotateIfNeeded(Buffer.byteLength(line));
      appendFileSync(this.logFilePath, line, 'utf8');
    } catch {
      // Logging should never break request handling.
    }
  }

  private rotateIfNeeded(nextLineBytes: number): void {
    if (!existsSync(this.logFilePath)) {
      return;
    }
    const size = statSync(this.logFilePath).size;
    if (size + nextLineBytes <= this.maxFileSizeBytes) {
      return;
    }
    const suffix = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = join(this.logsDir, `app-${suffix}.log`);
    renameSync(this.logFilePath, rotatedPath);
  }
}
