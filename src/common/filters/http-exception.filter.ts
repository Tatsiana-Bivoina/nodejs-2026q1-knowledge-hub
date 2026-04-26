import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../logging/app-logger';
import { isCustomHttpError } from '../errors/http-errors';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const trace = exception instanceof Error ? exception.stack : undefined;

    this.logger.error('Unhandled request exception', trace, 'Exceptions');

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const error = exception.getResponse();
      response.status(status).json({
        statusCode: status,
        error:
          typeof error === 'object' && error !== null && 'error' in error
            ? (error as { error?: unknown }).error
            : HttpStatus[status] ?? 'Error',
        message:
          typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message?: unknown }).message
            : exception.message,
        path: request.url,
      });
      return;
    }

    if (isCustomHttpError(exception)) {
      response.status(exception.statusCode).json({
        statusCode: exception.statusCode,
        error: HttpStatus[exception.statusCode] ?? 'Error',
        message: exception.message,
        path: request.url,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      path: request.url,
    });
  }
}
