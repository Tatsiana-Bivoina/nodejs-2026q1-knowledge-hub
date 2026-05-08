import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

type DataWithPassword = Record<string, unknown> & {
  password?: unknown;
  passwordHash?: unknown;
};

@Injectable()
export class StripPasswordInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (Array.isArray(data)) {
          return data.map((item) => this.stripOne(item as DataWithPassword));
        }
        if (data && typeof data === 'object') {
          return this.stripOne(data as DataWithPassword);
        }
        return data;
      }),
    );
  }

  private stripOne(item: DataWithPassword): DataWithPassword {
    const { password, passwordHash, ...rest } = item;
    void password;
    void passwordHash;
    return rest;
  }
}
