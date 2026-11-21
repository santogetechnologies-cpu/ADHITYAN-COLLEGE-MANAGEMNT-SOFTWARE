#!/usr/bin/env bash
# Builds a throw-away local Postgres database, applies EVERY migration in order with ON_ERROR_STOP, then runs the smoke tests.
# Needs a running local PostgreSQL 15+ you can create databases in (psql on PATH; set PGHOST/PGPORT/PGUSER as usual).
#   bash supabase/tests/run_all.sh            -> uses database name "erp_verify" (dropped and recreated)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; DB="${1:-erp_verify}"
psql -d postgres -qc "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
psql -d "$DB" -qc "ALTER DATABASE $DB SET search_path = \"\$user\", public, extensions"
psql -d "$DB" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/stub/supabase_stub.sql" >/dev/null
for f in $(ls "$ROOT"/supabase/migrations/*.sql | sort); do
  echo "applying $(basename "$f")"; psql -d "$DB" -q -v ON_ERROR_STOP=1 -1 -f "$f" >/dev/null
done
echo "== smoke tests"; OUT="$(psql -d "$DB" -f "$ROOT/supabase/tests/smoke_all.sql" 2>&1 || true)"
echo "$OUT" | grep -E "FAIL|ERROR" || true
PASS=$(echo "$OUT" | grep -c PASS || true); echo "$PASS checks passed"
if echo "$OUT" | grep -qE "FAIL|ERROR"; then exit 1; fi
