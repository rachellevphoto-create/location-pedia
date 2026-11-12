#!/usr/bin/env bash
# Create (or reset) a separate database for the tests, next to the dev DB.
# It is built with the real migrations, so tests never touch real data.
#
#   npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
. ./.env
set +a

# Same server and credentials as DATABASE_URL, database name "locatepedia_test".
TEST_DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's#(:[0-9]+)/[^?]+#\1/locatepedia_test#')"
ADMIN_URL="${DATABASE_URL%%\?*}"

PSQL="${PSQL:-psql}"
"$PSQL" "$ADMIN_URL" -qc "DROP DATABASE IF EXISTS locatepedia_test"
"$PSQL" "$ADMIN_URL" -qc "CREATE DATABASE locatepedia_test"

# PostGIS needs a superuser. On a local Homebrew Postgres that is your OS
# user (no password); override with PG_SUPERUSER_URL if yours differs.
PORT="$(printf '%s' "$DATABASE_URL" | sed -E 's#.*:([0-9]+)/.*#\1#')"
SUPER_URL="${PG_SUPERUSER_URL:-postgresql://localhost:$PORT/locatepedia_test}"
"$PSQL" "$SUPER_URL" -qc "CREATE EXTENSION IF NOT EXISTS postgis"

DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
echo "Test database ready."
