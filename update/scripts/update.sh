#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
BRANCH=${ICEC_UPDATE_BRANCH:-next}

fail(){ echo "ERROR: $*" >&2; exit 1; }
command -v git >/dev/null 2>&1 || fail "git is not installed"
command -v docker >/dev/null 2>&1 || fail "docker is not installed"
docker compose version >/dev/null 2>&1 || fail "docker compose is not available"
[ -f .env ] || fail ".env is missing"
[ -f VERSION ] || fail "VERSION is missing"

current_branch=$(git branch --show-current)
[ "$current_branch" = "$BRANCH" ] || fail "current branch is '$current_branch'; expected '$BRANCH'"
[ -z "$(git status --porcelain)" ] || fail "working tree has local changes; commit or stash them first"

echo "IceC Lab updater - installed v$(cat VERSION)"
echo "1/6 Creating PostgreSQL backup..."
./scripts/backup.sh

echo "2/6 Fetching origin/$BRANCH..."
git fetch origin "$BRANCH"
local_rev=$(git rev-parse HEAD)
remote_rev=$(git rev-parse "origin/$BRANCH")
if [ "$local_rev" = "$remote_rev" ]; then
  echo "Already on the latest Git revision."
else
  git merge --ff-only "origin/$BRANCH" || fail "fast-forward update failed"
fi

echo "3/6 Building and starting containers..."
docker compose up -d --build

echo "4/6 Waiting for healthy containers..."
i=0
while [ $i -lt 36 ]; do
  db=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' icec-db 2>/dev/null || echo missing)
  api=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' icec-api 2>/dev/null || echo missing)
  web=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' icec-web 2>/dev/null || echo missing)
  if [ "$db" = healthy ] && [ "$api" = healthy ] && [ "$web" = healthy ]; then break; fi
  i=$((i+1)); sleep 5
done
[ "$db" = healthy ] && [ "$api" = healthy ] && [ "$web" = healthy ] || { docker compose ps; fail "containers did not become healthy (db=$db api=$api web=$web)"; }

echo "5/6 Checking API and data integrity..."
health=$(docker compose exec -T api wget -qO- http://127.0.0.1:3001/api/health) || fail "API health request failed"
echo "$health" | grep -q '"ok":true' || fail "API health check returned an unexpected response"
integrity=$(docker compose exec -T api wget -qO- http://web/api/integrity 2>/dev/null || true)
if [ -z "$integrity" ]; then
  if command -v curl >/dev/null 2>&1; then integrity=$(curl -fsS http://127.0.0.1:3000/api/integrity || true); fi
fi
[ -n "$integrity" ] || fail "integrity endpoint could not be reached"
echo "$integrity" | grep -q '"ok":true' || { echo "$integrity"; fail "database integrity check reported issues"; }

echo "6/6 Complete."
echo "IceC Lab Next v$(cat VERSION)"
docker compose ps
