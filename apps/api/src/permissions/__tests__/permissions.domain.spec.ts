import {
  scopeLevel,
  isScopeSufficient,
  hasPermission,
  canAccessResource,
  resolveHighestScope,
  UserPermission,
  ScopeContext,
} from '../permissions.domain';
import { PermissionScope } from '../permissions.decorator';

describe('PermissionsDomain', () => {
  describe('scopeLevel', () => {
    it('should return 1 for SELF', () => {
      expect(scopeLevel(PermissionScope.SELF)).toBe(1);
    });

    it('should return 2 for TEAM', () => {
      expect(scopeLevel(PermissionScope.TEAM)).toBe(2);
    });

    it('should return 3 for ORGANIZATION', () => {
      expect(scopeLevel(PermissionScope.ORGANIZATION)).toBe(3);
    });

    it('should order scopes: SELF < TEAM < ORGANIZATION', () => {
      expect(scopeLevel(PermissionScope.SELF)).toBeLessThan(
        scopeLevel(PermissionScope.TEAM),
      );
      expect(scopeLevel(PermissionScope.TEAM)).toBeLessThan(
        scopeLevel(PermissionScope.ORGANIZATION),
      );
    });
  });

  describe('isScopeSufficient', () => {
    it('should return true when granted scope equals required scope', () => {
      expect(isScopeSufficient(PermissionScope.SELF, PermissionScope.SELF)).toBe(true);
      expect(isScopeSufficient(PermissionScope.TEAM, PermissionScope.TEAM)).toBe(true);
      expect(isScopeSufficient(PermissionScope.ORGANIZATION, PermissionScope.ORGANIZATION)).toBe(true);
    });

    it('should return true when granted scope is higher than required', () => {
      expect(isScopeSufficient(PermissionScope.TEAM, PermissionScope.SELF)).toBe(true);
      expect(isScopeSufficient(PermissionScope.ORGANIZATION, PermissionScope.SELF)).toBe(true);
      expect(isScopeSufficient(PermissionScope.ORGANIZATION, PermissionScope.TEAM)).toBe(true);
    });

    it('should return false when granted scope is lower than required', () => {
      expect(isScopeSufficient(PermissionScope.SELF, PermissionScope.TEAM)).toBe(false);
      expect(isScopeSufficient(PermissionScope.SELF, PermissionScope.ORGANIZATION)).toBe(false);
      expect(isScopeSufficient(PermissionScope.TEAM, PermissionScope.ORGANIZATION)).toBe(false);
    });
  });

  describe('hasPermission', () => {
    const permissions: UserPermission[] = [
      { action: 'read', resource: 'employees', scope: PermissionScope.TEAM },
      { action: 'write', resource: 'employees', scope: PermissionScope.SELF },
      { action: 'read', resource: 'budgets', scope: PermissionScope.ORGANIZATION },
    ];

    it('should return true when exact permission with sufficient scope exists', () => {
      expect(hasPermission(permissions, 'read', 'employees', PermissionScope.SELF)).toBe(true);
      expect(hasPermission(permissions, 'read', 'employees', PermissionScope.TEAM)).toBe(true);
    });

    it('should return false when scope is insufficient', () => {
      expect(hasPermission(permissions, 'read', 'employees', PermissionScope.ORGANIZATION)).toBe(false);
    });

    it('should return false when action does not match', () => {
      expect(hasPermission(permissions, 'delete', 'employees', PermissionScope.SELF)).toBe(false);
    });

    it('should return false when resource does not match', () => {
      expect(hasPermission(permissions, 'read', 'unknown', PermissionScope.SELF)).toBe(false);
    });

    it('should return false for empty permissions list', () => {
      expect(hasPermission([], 'read', 'employees', PermissionScope.SELF)).toBe(false);
    });

    it('should allow ORGANIZATION scope to satisfy any requirement on same resource', () => {
      expect(hasPermission(permissions, 'read', 'budgets', PermissionScope.SELF)).toBe(true);
      expect(hasPermission(permissions, 'read', 'budgets', PermissionScope.TEAM)).toBe(true);
      expect(hasPermission(permissions, 'read', 'budgets', PermissionScope.ORGANIZATION)).toBe(true);
    });
  });

  describe('canAccessResource', () => {
    const userId = 'user-1';
    const teamMemberIds = ['team-member-1', 'team-member-2'];
    const organizationId = 'org-1';

    describe('SELF scope', () => {
      it('should allow access when user is the resource owner', () => {
        const context: ScopeContext = {
          userId,
          resourceOwnerId: userId,
        };
        expect(canAccessResource(PermissionScope.SELF, context)).toBe(true);
      });

      it('should deny access when user is not the resource owner', () => {
        const context: ScopeContext = {
          userId,
          resourceOwnerId: 'other-user',
        };
        expect(canAccessResource(PermissionScope.SELF, context)).toBe(false);
      });
    });

    describe('TEAM scope', () => {
      it('should allow access to own resources', () => {
        const context: ScopeContext = {
          userId,
          resourceOwnerId: userId,
          teamMemberIds,
        };
        expect(canAccessResource(PermissionScope.TEAM, context)).toBe(true);
      });

      it('should allow access to team member resources', () => {
        const context: ScopeContext = {
          userId,
          resourceOwnerId: 'team-member-1',
          teamMemberIds,
        };
        expect(canAccessResource(PermissionScope.TEAM, context)).toBe(true);
      });

      it('should deny access to non-team-member resources', () => {
        const context: ScopeContext = {
          userId,
          resourceOwnerId: 'stranger',
          teamMemberIds,
        };
        expect(canAccessResource(PermissionScope.TEAM, context)).toBe(false);
      });

      it('should deny access when teamMemberIds is not provided and not own resource', () => {
        const context: ScopeContext = {
          userId,
          resourceOwnerId: 'other-user',
        };
        expect(canAccessResource(PermissionScope.TEAM, context)).toBe(false);
      });
    });

    describe('ORGANIZATION scope', () => {
      it('should allow access when both users are in the same organization', () => {
        const context: ScopeContext = {
          userId,
          organizationId,
          resourceOrganizationId: organizationId,
        };
        expect(canAccessResource(PermissionScope.ORGANIZATION, context)).toBe(true);
      });

      it('should deny access when organizations differ', () => {
        const context: ScopeContext = {
          userId,
          organizationId,
          resourceOrganizationId: 'other-org',
        };
        expect(canAccessResource(PermissionScope.ORGANIZATION, context)).toBe(false);
      });

      it('should allow access when org context is missing (defaults to same org)', () => {
        const context: ScopeContext = {
          userId,
        };
        expect(canAccessResource(PermissionScope.ORGANIZATION, context)).toBe(true);
      });
    });
  });

  describe('resolveHighestScope', () => {
    it('should return undefined when no matching permission exists', () => {
      const permissions: UserPermission[] = [
        { action: 'read', resource: 'employees', scope: PermissionScope.SELF },
      ];
      expect(resolveHighestScope(permissions, 'write', 'employees')).toBeUndefined();
      expect(resolveHighestScope(permissions, 'read', 'budgets')).toBeUndefined();
    });

    it('should return the only matching scope', () => {
      const permissions: UserPermission[] = [
        { action: 'read', resource: 'employees', scope: PermissionScope.TEAM },
      ];
      expect(resolveHighestScope(permissions, 'read', 'employees')).toBe(PermissionScope.TEAM);
    });

    it('should return the highest scope when multiple permissions match', () => {
      const permissions: UserPermission[] = [
        { action: 'read', resource: 'employees', scope: PermissionScope.SELF },
        { action: 'read', resource: 'employees', scope: PermissionScope.ORGANIZATION },
        { action: 'read', resource: 'employees', scope: PermissionScope.TEAM },
      ];
      expect(resolveHighestScope(permissions, 'read', 'employees')).toBe(
        PermissionScope.ORGANIZATION,
      );
    });

    it('should return undefined for empty permissions', () => {
      expect(resolveHighestScope([], 'read', 'employees')).toBeUndefined();
    });
  });
});
