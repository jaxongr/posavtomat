import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '@savdo-pos/shared-types';

interface ErrorBody {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

/** Converts every thrown error into the contract envelope { error: {...} }. */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorBody = { code: 'E5001', message: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'code' in res) {
        // BusinessException
        body = res as ErrorBody;
      } else if (typeof res === 'object' && res !== null && 'message' in res) {
        // Nest ValidationPipe / built-in
        const msg = (res as { message: string | string[] }).message;
        body = {
          code: status === HttpStatus.BAD_REQUEST ? 'E3001' : 'E2003',
          message: Array.isArray(msg) ? msg.join('; ') : msg,
        };
      } else {
        body = { code: 'E2003', message: exception.message };
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${status} ${body.code}`);
    }

    response.status(status).json({ error: body });
  }
}
