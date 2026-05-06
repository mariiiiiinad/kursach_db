#!/bin/sh
set -eu

DB_NAME="${DB_NAME:-hosdb}"

if ! psql postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';" | grep -q 1; then
  createdb "${DB_NAME}"
fi

psql "${DB_NAME}" -f "../database_schema.sql"
psql "${DB_NAME}" -f "./db/seed.sql"

echo "Database '${DB_NAME}' is ready."
