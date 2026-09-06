import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@strata/database';
import { getSupabaseAdmin } from './supabase';

/**
 * AuthService — coordinates between Supabase Auth (identity provider)
 * and the local Prisma database (app profile/data).
 *
 * All authentication (login, signup, token refresh) happens on the
 * frontend via the Supabase browser client. This service only handles:
 * - Syncing Supabase users → local Prisma User records
 * - Looking up local user profiles
 * - Server-side session revocation (logout)
 */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Get user profile from the local database.
   */
  async getProfile(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { supabaseUserId },
      include: { person: true },
    });

    if (!user) return null;

    // Find the user's company membership
    const membership = await this.prisma.userCompanyMembership.findFirst({
      where: { userId: user.id },
      include: { company: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.person?.fullName || user.email,
      supabaseUserId: user.supabaseUserId,
      companyId: membership?.companyId || null,
      companyName: membership?.company?.name || null,
      isSuperAdmin: membership?.isSuperAdmin || false,
    };
  }

  /**
   * Ensure a local User record exists for a Supabase user.
   * Also creates a Company + membership if the user signed up with a company name.
   * Called on first authenticated API request to sync identity → profile.
   */
  async ensureLocalUser(supabaseUserId: string, email: string) {
    // Fast path: user already linked
    const existing = await this.prisma.user.findUnique({
      where: { supabaseUserId },
    });
    if (existing) return existing;

    // Migration path: legacy user with same email but no Supabase link
    const legacyUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (legacyUser && !legacyUser.supabaseUserId) {
      return this.prisma.user.update({
        where: { id: legacyUser.id },
        data: { supabaseUserId },
      });
    }

    if (legacyUser) return legacyUser;

    // Fetch Supabase user metadata (contains full_name, company_name)
    const supabase = getSupabaseAdmin();
    const { data: supabaseUser } = await supabase.auth.admin.getUserById(
      supabaseUserId,
    );

    const fullName =
      supabaseUser?.user?.user_metadata?.full_name ||
      email.split('@')[0];
    const companyName =
      supabaseUser?.user?.user_metadata?.company_name || null;

    // Create Person + User
    const person = await this.prisma.person.create({
      data: {
        fullName,
        email,
        dateOfBirth: new Date('1970-01-01'),
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        personId: person.id,
        supabaseUserId,
      },
    });

    // If a company name was provided during signup, create the company
    // and make the user a super admin of it
    if (companyName) {
      // Generate a URL-safe slug from the workspace name
      const baseSlug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Try base slug first, append counter if taken
      let slug = baseSlug;
      let attempt = 0;
      while (await this.prisma.company.findUnique({ where: { slug } })) {
        attempt++;
        slug = `${baseSlug}-${attempt}`;
      }

      const company = await this.prisma.company.create({
        data: {
          name: companyName,
          slug,
        },
      });

      await this.prisma.userCompanyMembership.create({
        data: {
          userId: user.id,
          companyId: company.id,
          isSuperAdmin: true,
        },
      });

      // Enable all features for the new workspace
      const allFeatures = await this.prisma.feature.findMany({
        select: { id: true },
      });
      if (allFeatures.length > 0) {
        await this.prisma.companyFeature.createMany({
          data: allFeatures.map((f) => ({
            companyId: company.id,
            featureId: f.id,
            enabled: true,
          })),
          skipDuplicates: true,
        });
      }
    }

    return user;
  }

  /**
   * Revoke a Supabase session server-side.
   */
  async logout(accessToken: string) {
    const supabase = getSupabaseAdmin();
    await supabase.auth.admin.signOut(accessToken, 'local');
    return { message: 'Logged out successfully' };
  }
}
