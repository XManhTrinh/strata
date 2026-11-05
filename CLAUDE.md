# Strata

Strata was rebuilt from scratch (Next.js 16 + Supabase + `@windmorph/react` /
`@windmorph/react-pro`, Material Design 3) and lives on `main`. The old NestJS/Prisma system is
kept at the `legacy` tag as reference material only: port business rules from it, never copy files.

Claude Code and Kiro share one source of truth. Read these before planning or changing anything:

- `.kiro/steering/status.md`: what is done and what is next (start here)
- `docs/product-decisions.md`: what the product does (authoritative)
- `docs/architecture/0001-tech-stack.md`: the stack and libraries
- `docs/rebuild-plan.md`: architecture, database design, screens, phases
- `.kiro/steering/*.md`: working rules (product, tech, structure, UI, database, testing)
- `.kiro/specs/<phase>/`: requirements, design and tasks per phase; tick tasks in `tasks.md`
  as they are completed

When a decision changes, update `docs/product-decisions.md` first, then the steering and specs.

Key rules (details in the steering files):

- One product for every size of organization; never build for one client. Offer the general,
  per-workspace configurable version.
- Windmorph components first; other libraries for logic only; Windmorph tokens only.
- RLS on every table; permission functions in `app.*`; never the service key for user requests.
- Schema only through `supabase/migrations`, with pgTAP tests for every policy and RPC.
- Latest stable dependencies, only what is used (`knip`).
- Never run package installs in `/tmp`, `$TMPDIR` or a scratch folder.
