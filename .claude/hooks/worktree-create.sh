#!/usr/bin/env bash
# WorktreeCreate hook: git worktree + its own Compose project.
# stdin: {"name": "...", "cwd": "...", ...}. stdout: worktree path (last line). Logs go to stderr.
set -euo pipefail
exec 3>&1 1>&2

input=$(cat)
name=$(jq -er .name <<<"$input")
cwd=$(jq -er .cwd <<<"$input")

# Main checkout root, even when called from inside another worktree.
root=$(dirname "$(git -C "$cwd" rev-parse --path-format=absolute --git-common-dir)")
dir="$root/.claude/worktrees/$name"

if [[ ! -e "$dir" ]]; then
  # Base = HEAD of the checkout Claude runs in (same as worktree.baseRef "head").
  git -C "$cwd" worktree add -b "worktree-$name" "$dir" HEAD
  slug=$(tr '[:upper:]' '[:lower:]' <<<"$name" | tr -c 'a-z0-9_\n-' '-')
  project="calendar-$slug-$(openssl rand -hex 3)"
  # Compose reads .env from the project dir, so every `docker compose` call
  # inside this worktree targets this project without extra flags.
  echo "COMPOSE_PROJECT_NAME=$project" >> "$dir/.env"
fi

project=$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' "$dir/.env")
echo "worktree $dir: compose project $project" \
  "(manual cleanup: docker compose -p $project down -v --remove-orphans)"

cd "$dir"
# --wait blocks until every service is healthy, so the commands below can rely on them.
if ! docker compose up -d --wait; then
  echo "environment failed to start, rolling back $project"
  docker compose down -v --remove-orphans || true
  git -C "$root" worktree remove --force "$dir" || true
  git -C "$root" branch -D "worktree-$name" || true
  exit 1
fi

# Commands that need running services (migrations, seeds) go here.
docker compose exec -T db psql -U calendar -d calendar -c 'select 1' >/dev/null

echo "$dir" >&3
