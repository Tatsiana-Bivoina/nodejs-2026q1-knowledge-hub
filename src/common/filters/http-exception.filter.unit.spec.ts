import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../errors/http-errors';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const makeFilter = () => {
    const logger = {
      error: vi.fn(),
    } as any;
    return { filter: new HttpExceptionFilter(logger), logger };
  };

  it('returns status and error shape for HttpException', () => {
    const { filter, logger } = makeFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });

    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/auth/login' }),
      }),
    } as any;

    const exception = new BadRequestException('Invalid payload');
    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Invalid payload',
      path: '/auth/login',
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('maps custom errors via statusCode property', () => {
    const { filter } = makeFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/articles' }),
      }),
    } as any;

    filter.catch(new ValidationError('Wrong input'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      error: 'BAD_REQUEST',
      message: 'Wrong input',
      path: '/articles',
    });
  });

  it('returns generic 500 for unknown errors', () => {
    const { filter } = makeFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/users' }),
      }),
    } as any;

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      path: '/users',
    });
  });
});
