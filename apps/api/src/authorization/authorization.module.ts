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

/**
 * Global authorization module providing the permission system.
 */
@Global()
@Module({
  imports: [AuthModule, AdminModule, CompatModule],
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
