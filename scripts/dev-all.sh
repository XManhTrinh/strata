#!/bin/sh
# Bring up the whole local stack: Supabase (Postgres, Auth, Storage, Realtime, Mailpit) and the
# Next.js dev server, in one command: pnpm dev:all
#
# Supabase runs in Docker and keeps running after this script exits (stop it with `supabase stop`).
# The Next.js dev server runs in the foreground; Ctrl-C stops only it, not Supabase.
set -eu

# Supabase needs Docker (Docker Desktop or OrbStack) running.
if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Start Docker Desktop or OrbStack, then try again." >&2
  exit 1
fi

# Start Supabase only if it isn't already up, so re-running is cheap.
if supabase status >/dev/null 2>&1; then
  echo "Supabase is already running."
else
  echo "Starting Supabase (first run pulls images; this can take a minute)..."
  supabase start
fi

echo
echo "Local stack:"
echo "  App        http://localhost:3000"
echo "  Supabase   http://127.0.0.1:54323   (Studio)"
echo "  Mailpit    http://127.0.0.1:54324   (all local email)"
echo
echo "If email sign-up/invitations are missing, set SMTP_URL and EMAIL_FROM in .env.local"
echo "(see .env.example) and restart; without them, sign-up is Google-only by design."
echo
echo "Starting the Next.js dev server (Ctrl-C stops it; Supabase keeps running)..."
exec next dev
