#!/usr/bin/env sh
set -eu
file=${1:-}
if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "Usage: ./scripts/restore.sh backups/icec-YYYYMMDD-HHMMSS.sql" >&2
  exit 2
fi
printf 'This will replace the IceC PostgreSQL database using %s. Type RESTORE to continue: ' "$file"
read answer
[ "$answer" = "RESTORE" ] || { echo "Cancelled."; exit 1; }
echo "Restoring..."
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$file"
echo "Restore complete. Reload IceC Lab in the browser."
