import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface PaginatedResult<T> {
  items: T[];
  meta: { total: number; cursor?: string; hasNext: boolean };
}

function isPaginated<T>(value: unknown): value is PaginatedResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    'meta' in value &&
    Array.isArray((value as PaginatedResult<T>).items)
  );
}

/** Wraps every successful response in { data, meta? }. */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<{ data: T }> {
    return next.handle().pipe(
      map((payload) => {
        if (isPaginated(payload)) {
          return { data: payload.items, meta: payload.meta } as unknown as { data: T };
        }
        return { data: payload };
      }),
    );
  }
}
