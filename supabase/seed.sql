-- Demo data for local development only; never runs in production.
-- Demo personal, team and company workspaces are added in Phase 1.

-- The scheduler calls the local app (`pnpm dev` on port 3000) for jobs such as notification
-- emails, with the secret in .env.local. Staging and production set their own in Vault.
select vault.create_secret('http://host.docker.internal:3000', 'app_url');
select vault.create_secret('local-jobs-secret', 'jobs_secret');
