# Worktree environments

Requires Docker with Compose v2 (on this machine: colima, start with `colima start`), `jq` and `mise`.

`.claude/settings.json` wires two hooks:

- `WorktreeCreate` → `.claude/hooks/worktree-create.sh`: creates `.claude/worktrees/<name>` on branch `worktree-<name>` from the current `HEAD` (not `origin/main`), writes a unique `COMPOSE_PROJECT_NAME=calendar-<name>-<hex>` to the worktree's `.env`, runs `mise install` (pinned tools, npm dependencies, Git hooks) and `docker compose up -d --wait`, and only then runs commands that need the services. On failure it rolls the worktree back.
- `WorktreeRemove` → `.claude/hooks/worktree-remove.sh`: `docker compose -p <id> down -v`, then removes the worktree and deletes its branch if merged. If Compose cleanup fails, the worktree stays for a retry.

Inside a worktree, plain `docker compose ...` targets that copy's project via `.env`; the Postgres host port is random, get it with `docker compose port db 5432`. Dev servers started with `mise daemons start` also get their own ports, shown by `mise daemons urls`.

The hooks fire for `claude --worktree`, `EnterWorktree`/`ExitWorktree`, subagent `isolation: worktree` and background sessions. Desktop-app «Worktree» sessions are not among the documented triggers (not tested), and `WorktreeRemove` does not fire for subagent worktrees or for `claude -p` runs. Clean those up manually:

```bash
docker compose ls -a --filter name=calendar-
docker compose -p <COMPOSE_PROJECT_NAME> down -v --remove-orphans
git worktree remove --force .claude/worktrees/<name>
```

The `down` command works by project id alone, without the compose file or the worktree directory.
