import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, ErrorCode } from '@savdo-pos/shared-types';

/** Maps domain error codes to HTTP status. */
const STATUS_BY_CODE: Record<ErrorCode, HttpStatus> = {
  E1001: HttpStatus.UNAUTHORIZED,
  E1002: HttpStatus.FORBIDDEN,
  E1003: HttpStatus.UNAUTHORIZED,
  E1004: HttpStatus.PAYMENT_REQUIRED,
  E2001: HttpStatus.NOT_FOUND,
  E2002: HttpStatus.CONFLICT,
  E2003: HttpStatus.UNPROCESSABLE_ENTITY,
  E3001: HttpStatus.BAD_REQUEST,
  E5001: HttpStatus.INTERNAL_SERVER_ERROR,
  E4001: HttpStatus.PAYMENT_REQUIRED,
  E4002: HttpStatus.ACCEPTED,
  E4010: HttpStatus.CONFLICT,
  E4011: HttpStatus.UNPROCESSABLE_ENTITY,
  E4101: HttpStatus.CONFLICT,
  E4102: HttpStatus.UNPROCESSABLE_ENTITY,
  E4201: HttpStatus.CONFLICT,
  E4202: HttpStatus.UNPROCESSABLE_ENTITY,
  E4301: HttpStatus.CONFLICT,
  E4302: HttpStatus.CONFLICT,
  E4401: HttpStatus.UNPROCESSABLE_ENTITY,
  E4501: HttpStatus.BAD_GATEWAY,
};

/**
 * Typed domain exception. Always thrown with a contract error code so the
 * GlobalExceptionFilter can render { error: { code, message, details? } }.
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      { code, message: message ?? ERROR_CODES[code], details },
      STATUS_BY_CODE[code] ?? HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
