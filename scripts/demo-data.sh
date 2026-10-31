#!/bin/sh
# Demo workspaces in the local database for an existing account: pnpm db:demo you@example.com
set -eu
if [ $# -ne 1 ]; then
  echo "Usage: pnpm db:demo <email of a local account>" >&2
  exit 1
fi
docker exec -i supabase_db_strata psql -U postgres -q -v email="$1" < supabase/demo/demo.sql
