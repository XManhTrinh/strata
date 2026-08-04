import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationEngine } from './authorization.engine';
import { AuthorizationGuard } from './authorization.guard';
import { ScopeResolverService } from './scope-resolver/scope-resolver.service';
import { ScopeResolverCache } from './scope-resolver/scope-resolver.cache';
import { PermissionCacheService } from './permission-cache/permission-cache.service';
import { FeatureRegistryService } from './feature-registry/feature-registry.service';
import { FeatureRegistryBootstrap } from './feature-registry/feature-registry.bootstrap';
import { AdminModule } from './admin/admin.module';
import { CompatModule } from './compat/compat.module';
import { MigrationModule } from './migration/migration.module';

/**
 * Global authorization module providing the v2 permission system.
 *
 * This module registers all authorization services and makes them available
 * throughout the application. It depends on AuthModule for PrismaClient and Redis.
 *
 * The AuthorizationGuard is NOT registered as a global APP_GUARD here —
 * it operates as a secondary guard that can be applied per-controller/handler
 * via the @RequireFeaturePermission decorator. The existing AuthGuard
 * (JWT validation) remains the primary global guard.
 */
@Global()
@Module({
  imports: [AuthModule, AdminModule, CompatModule, MigrationModule],
  providers: [
    AuthorizationEngine,
    AuthorizationGuard,
    ScopeResolverService,
    ScopeResolverCache,
    PermissionCacheService,
    FeatureRegistryService,
    FeatureRegistryBootstrap,
  ],
  exports: [
    AuthorizationEngine,
    AuthorizationGuard,
    ScopeResolverService,
    PermissionCacheService,
    FeatureRegistryService,
  ],
})
export class AuthorizationModule {}
