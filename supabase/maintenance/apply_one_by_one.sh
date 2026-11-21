#!/usr/bin/env bash
# Applies every migration in supabase/migrations ONE BY ONE to the database in $SUPABASE_DB_URL, stopping at the first failure.
# Each file runs in its own transaction (a failed file leaves nothing half-applied). After each success the file is recorded in
# Supabase's migration history (when the supabase CLI is installed and the project is linked), so `supabase db push` later does not
# try to run it again.
#
#   export SUPABASE_DB_URL='postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres'
#   bash supabase/maintenance/apply_one_by_one.sh
set -uo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL first (see the runbook, step B1)}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HAVE_CLI=0; command -v supabase >/dev/null 2>&1 && HAVE_CLI=1
TOTAL=$(ls "$ROOT"/supabase/migrations/*.sql | wc -l); N=0
for f in $(ls "$ROOT"/supabase/migrations/*.sql | sort); do
  N=$((N+1)); name="$(basename "$f")"; version="${name%%_*}"
  echo "[$N/$TOTAL] $name"
  if ! psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -q -f "$f" >/dev/null; then
    echo; echo "STOPPED: $name failed. Nothing from this file was kept. Fix the cause (see the runbook, Troubleshooting) and run this script again."
    echo "It will refuse to continue unless the database is empty, so run supabase/maintenance/wipe_everything.sql first."
    exit 1
  fi
  if [ "$HAVE_CLI" = 1 ]; then supabase migration repair --status applied "$version" >/dev/null 2>&1 || echo "  (note: could not record $version in the migration history; run: supabase migration repair --status applied $version)"; fi
done
echo; echo "All $TOTAL migrations applied."
