#!/usr/bin/env bash
# WorktreeRemove hook: drop the worktree's Compose project, then the worktree and its branch.
# stdin: {"worktree_path": "...", ...}. Non-zero exit keeps the worktree on disk.
set -euo pipefail

dir=$(jq -er .worktree_path)
root=$(dirname "$(git -C "$dir" rev-parse --path-format=absolute --git-common-dir)")
project=$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' "$dir/.env" 2>/dev/null || true)

if [[ -n "$project" ]]; then
  # Stop before touching files: if this fails, the worktree and its .env stay for a retry.
  docker compose -p "$project" down -v --remove-orphans >&2 || {
    echo "compose cleanup failed; retry: docker compose -p $project down -v --remove-orphans" >&2
    exit 1
  }
fi

branch=$(git -C "$dir" branch --show-current)
git -C "$root" worktree remove --force "$dir" >&2
# -d, not -D: a branch with unmerged commits is kept rather than lost.
[[ -n "$branch" ]] && { git -C "$root" branch -d "$branch" >&2 || echo "kept unmerged branch $branch" >&2; }
exit 0
