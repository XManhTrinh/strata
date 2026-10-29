#!/bin/sh
# Vercel install step: Windmorph Pro installs from a private GitHub repository, so git needs the
# read-only token before pnpm can fetch it.
set -eu

if [ -z "${WINDMORPH_PRO_TOKEN:-}" ]; then
  echo "WINDMORPH_PRO_TOKEN is not set for this Vercel environment (Production/Preview)." >&2
  exit 1
fi

git config --global \
  url."https://x-access-token:${WINDMORPH_PRO_TOKEN}@github.com/XManhTrinh/windmorph-pro".insteadOf \
  "https://github.com/XManhTrinh/windmorph-pro"

pnpm install --frozen-lockfile
