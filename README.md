# Strata

People, time and capacity planning for organizations of every size.

Built with Next.js 16, Supabase and Windmorph (Material Design 3). Plans and rules live in
[`docs/`](docs) and [`.kiro/`](.kiro); start with [`CLAUDE.md`](CLAUDE.md).

## Prerequisites

- **Node 26 LTS** (`nvm install` reads `.nvmrc`)
- **pnpm 12** (the exact version in `package.json` is picked automatically)
- **Supabase CLI** (`brew install supabase/tap/supabase`) and **Docker** for the local stack
- Read access to the private `XManhTrinh/windmorph-pro` repository (Windmorph Pro installs
  from it through git)

## Local setup

```bash
pnpm install
supabase start                       # local Postgres, Auth, Storage, Realtime
cp .env.example .env.local           # then fill in from: supabase status -o env
pnpm dev                             # http://localhost:3000
```

Install packages only inside this checkout (never in `/tmp` or another temporary folder).

## Scripts

| Script                                         | Does                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`       | Run, build and serve the app                                      |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint, TypeScript 7 type check, Prettier                         |
| `pnpm knip`                                    | Unused dependencies, files and exports                            |
| `pnpm test`                                    | Unit tests (Vitest)                                               |
| `pnpm test:e2e`                                | End-to-end tests (Playwright) at phone, tablet and desktop widths |
| `pnpm db:test`                                 | Database tests (pgTAP) against the local stack                    |
| `pnpm db:types`                                | Regenerate `src/lib/supabase/database.types.ts` after a migration |

## Database changes

Create a migration with `supabase migration new <name>`, apply it locally with
`supabase db reset`, add pgTAP tests in `supabase/tests`, then run `pnpm db:types`. Migrations
reach staging and production only through the `deploy-db` workflow.

## CI and deployment secrets

| Secret                                                                  | Where                                       | Purpose                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| `WINDMORPH_PRO_TOKEN`                                                   | GitHub, Vercel                              | Read-only token for the private Windmorph Pro repository |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` | GitHub environments `staging`, `production` | Applying migrations                                      |
