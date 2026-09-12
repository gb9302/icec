#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
VERSION=$(cat VERSION 2>/dev/null || echo unknown)
echo "IceC Lab Next v$VERSION"
echo
echo "Containers:"
docker compose ps
echo
echo "API health:"
if command -v curl >/dev/null 2>&1; then
  curl -fsS http://127.0.0.1:3000/api/health || true
  echo
else
  echo "curl not installed; container status shown above."
fi
echo
echo "Latest backup:"
latest=$(ls -1t backups/icec-*.sql 2>/dev/null | head -1 || true)
if [ -n "$latest" ]; then ls -lh "$latest"; else echo "No SQL backup found."; fi
