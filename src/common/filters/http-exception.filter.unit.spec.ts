import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  it('returns status and error shape', () => {
    const filter = new HttpExceptionFilter();
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
      path: '/auth/login',
      error: exception.getResponse(),
    });
  });
});
