import { AuthorizationEngine } from '../../authorization/authorization.engine';
import { PermissionScope } from '../../authorization/scope-resolver/scope-resolver.types';
import type { AssistantContext, AssistantTool } from '../assistant.types';

export interface ToolAuthorization {
  allowed: boolean;
  scope?: PermissionScope;
}

/**
 * Decide whether the caller may run a tool, using the same AuthorizationEngine
 * that gates the equivalent UI action. Fails closed: a tool with no declared
 * permission is denied rather than executed.
 */
export async function authorizeTool(
  engine: AuthorizationEngine,
  ctx: AssistantContext,
  tool: AssistantTool,
): Promise<ToolAuthorization> {
  if (!tool.requiredPermission) {
    return { allowed: false };
  }

  const decision = await engine.evaluate({
    userId: ctx.userId,
    companyId: ctx.companyId,
    feature: tool.requiredPermission.feature,
    permission: tool.requiredPermission.permission,
  });

  return { allowed: decision.allowed, scope: decision.effectiveScope };
}
