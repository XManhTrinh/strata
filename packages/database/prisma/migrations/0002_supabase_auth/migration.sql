-- Migration: Supabase Auth
-- Removes custom auth fields from User model, adds supabaseUserId,
-- drops RefreshToken and SSOConfig tables and SSOProvider enum.

-- Drop RefreshToken table
DROP TABLE IF EXISTS "RefreshToken";

-- Drop SSOConfig table
DROP TABLE IF EXISTS "SSOConfig";

-- Drop SSOProvider enum
DROP TYPE IF EXISTS "SSOProvider";

-- Remove auth-specific columns from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "isLocked";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lockedUntil";
ALTER TABLE "User" DROP COLUMN IF EXISTS "failedAttempts";
ALTER TABLE "User" DROP COLUMN IF EXISTS "ssoProviderId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "ssoSubjectId";

-- Add supabaseUserId column
ALTER TABLE "User" ADD COLUMN "supabaseUserId" TEXT;

-- Add unique constraint on supabaseUserId
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");
