import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AuditOperation } from '@strata/database';

/**
 * AuditInterceptor is a utility NestJS interceptor that can be applied
 * to controllers or routes to automatically capture entity changes on
 * create/update/delete operations.
 *
 * Modules can opt into this interceptor by applying it via @UseInterceptors().
 *
 * It expects the response body to contain `entityType`, `entityId`, and optionally
 * `diff` fields, or it will attempt to infer them from the request context.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only capture mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const userId = request.user?.sub;
    if (!userId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        if (!responseBody) return;

        try {
          const operation = this.mapMethodToOperation(method);
          const entityType =
            responseBody.entityType || this.inferEntityType(context);
          const entityId =
            responseBody.id || request.params?.id || responseBody.entityId;

          if (!entityType || !entityId) return;

          const diff = responseBody.diff || this.buildDiff(method, request.body, responseBody);

          await this.auditService.create(
            userId,
            entityType,
            entityId,
            operation,
            diff,
          );
        } catch {
          // Audit failures should not break the main request
        }
      }),
    );
  }

  private mapMethodToOperation(method: string): AuditOperation {
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }

  private inferEntityType(context: ExecutionContext): string | undefined {
    const controller = context.getClass().name;
    // Strip "Controller" suffix to get entity type
    return controller.replace(/Controller$/, '');
  }

  private buildDiff(
    method: string,
    requestBody: any,
    responseBody: any,
  ): Record<string, unknown> {
    switch (method) {
      case 'POST':
        return { after: responseBody };
      case 'PUT':
      case 'PATCH':
        return { changes: requestBody, after: responseBody };
      case 'DELETE':
        return { before: responseBody };
      default:
        return {};
    }
  }
}
