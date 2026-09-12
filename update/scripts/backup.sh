#!/usr/bin/env sh
set -eu
mkdir -p backups
stamp=$(date +%Y%m%d-%H%M%S)
file="backups/icec-${stamp}.sql"
echo "Creating PostgreSQL backup: $file"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' > "$file"
test -s "$file"
echo "Backup complete: $file"
