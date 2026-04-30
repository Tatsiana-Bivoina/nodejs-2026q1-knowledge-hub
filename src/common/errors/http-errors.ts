export class NotFoundError extends Error {
  readonly statusCode = 404;

  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;

  constructor(message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  readonly statusCode = 401;

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403;

  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class InternalError extends Error {
  readonly statusCode = 500;

  constructor(message = 'Internal server error') {
    super(message);
    this.name = 'InternalError';
  }
}

export class ServiceUnavailableError extends Error {
  readonly statusCode = 503;

  constructor(message = 'Service unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

export function isCustomHttpError(error: unknown): error is {
  statusCode: number;
  message: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}
