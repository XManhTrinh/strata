import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let error: string;
    let message: string;
    let details: unknown = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        error = HttpStatus[statusCode] || 'Error';
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        error = (responseObj.error as string) || HttpStatus[statusCode] || 'Error';
        message = (responseObj.message as string) || exception.message;
        details = responseObj.details || null;
      } else {
        error = HttpStatus[statusCode] || 'Error';
        message = exception.message;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'Internal Server Error';

      // Extract real error message instead of generic text
      if (exception instanceof Error) {
        message = exception.message;
        // Include stack trace in development
        if (process.env.NODE_ENV !== 'production') {
          details = exception.stack;
        }
      } else {
        message = 'An unexpected error occurred';
      }

      // Log the full error for server-side debugging
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const errorResponse = {
      statusCode,
      error,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request as unknown as Record<string, unknown>).requestId || null,
    };

    response.status(statusCode).json(errorResponse);
  }
}
