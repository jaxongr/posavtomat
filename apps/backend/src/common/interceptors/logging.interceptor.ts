import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/** Logs method, url and duration for every request. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const startedAt = process.hrtime.bigint();
    return next.handle().pipe(
      tap(() => {
        const ms = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        this.logger.log(`${req.method} ${req.originalUrl} ${ms.toFixed(1)}ms`);
      }),
    );
  }
}
