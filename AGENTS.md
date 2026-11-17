# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Hexlet learning project «Календарь звонков» (ai-for-developers program): a calendar booking service built together with AI. Expected behaviour: https://files.hexlet.app/a/2ipc5m

Current state: no application code yet — only `README.md`, CI and the dev Postgres in `compose.yaml`. Stack is not chosen (README says «Разное»). When a stack is picked, add build/lint/test commands here and fill the README «Установка» and «Использование» sections.

## Worktree environments

Requires Docker with Compose v2 (on this machine: colima, start with `colima start`) and `jq`.

`.claude/settings.json` wires two hooks:

- `WorktreeCreate` → `.claude/hooks/worktree-create.sh`: creates `.claude/worktrees/<name>` on branch `worktree-<name>` from the current `HEAD` (not `origin/main`), writes a unique `COMPOSE_PROJECT_NAME=calendar-<name>-<hex>` to the worktree's `.env`, runs `docker compose up -d --wait` and only then runs commands that need the services. On failure it rolls the worktree back.
- `WorktreeRemove` → `.claude/hooks/worktree-remove.sh`: `docker compose -p <id> down -v`, then removes the worktree and deletes its branch if merged. If Compose cleanup fails, the worktree stays for a retry.

Inside a worktree, plain `docker compose ...` targets that copy's project via `.env`; the Postgres host port is random, get it with `docker compose port db 5432`.

The hooks fire for `claude --worktree`, `EnterWorktree`/`ExitWorktree`, subagent `isolation: worktree` and background sessions. Desktop-app «Worktree» sessions are not among the documented triggers (not tested), and `WorktreeRemove` does not fire for subagent worktrees or for `claude -p` runs. Clean those up manually:

```bash
docker compose ls -a --filter name=calendar-
docker compose -p <COMPOSE_PROJECT_NAME> down -v --remove-orphans
git worktree remove --force .claude/worktrees/<name>
```

The `down` command works by project id alone, without the compose file or the worktree directory.

## CI constraints

- `.github/workflows/hexlet-check.yml` is auto-generated and runs Hexlet's checks (`hexlet/project-action`) on every push to any branch or tag. Do not edit, delete, or rename it, and do not rename the repository.
- Hexlet tests become meaningful only after all project steps are completed in the Hexlet interface; a failing check before that is expected.
