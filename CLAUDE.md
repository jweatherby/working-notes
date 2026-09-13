# CLAUDE.md — Working Notes

A local-only, single-user structured notebook: an org chart (people, teams, departments), projects, notes, docs, todos, tags, and branded reports with charts. A more opinionated Obsidian, backed by SQLite.

**Claude is the primary way data gets in**, through the CLI, which calls the app's tRPC API. The web UI is mainly for looking at the data (usually in the Claude desktop browser pane) and for printing reports to PDF.

Scoped docs:

- `src/api/CLAUDE.md`: domains, the Registry, Result, tRPC, reports and the chart spec
- `src/lib/CLAUDE.md`: components, stores, chart rendering, SCSS
- `src/routes/CLAUDE.md`: routes, the files route, print pages
- `prisma/CLAUDE.md`: SQLite schema conventions and migrations
- `tests/CLAUDE.md`: unit and integration tests

## Ground rules

- **Local-only, single user.** There are no users, auth, orgs, permissions or sharing. Don't add them.
- **No LLM, no secrets, no outbound network.** Claude is the intelligence; the app never calls a model or any external service. Don't add API keys, SDKs, analytics, CDNs or remote storage.
- **Data never leaves this Mac.** No cloud sync and no git for data; backups are local snapshots.
- **The network boundary is the security boundary** (`src/hooks.server.ts`). Keep all three parts:
  - the server binds to `127.0.0.1`
  - requests whose hostname isn't loopback get 403 (blocks DNS rebinding)
  - `/api/trpc` requires the `x-working-notes: 1` header (blocks cross-site requests)

## Stack

- **Runtime:** Bun
- **Framework:** SvelteKit (Svelte 5, TypeScript, SCSS), `@sveltejs/adapter-node`
- **API:** tRPC v11 + Zod over the Fetch adapter. This is the validated API behind both the UI and the CLI.
- **Database:** SQLite through Prisma 7 and `@prisma/adapter-libsql`. The better-sqlite3 adapter does not run under Bun.
- **Content:** marked and Milkdown for markdown, chart.js for charts, mermaid for diagrams
- **Tests:** Vitest (unit and integration)

## Where code goes

```
src/
├── api/      # Backend-only: domain operations + tRPC routers
├── shared/   # Used by both sides: tRPC, registry, settings, storage, types, utils
├── lib/      # Frontend: components, stores, chart rendering
└── routes/   # SvelteKit routes — thin entry points
```

Ask "who imports this?" Only the backend → `src/api/`. Both → `src/shared/`. Only the frontend → `src/lib/`.

## Writing data with the CLI

The CLI runs the tRPC router in-process against the local database, with the same Zod validation as the app. **The app doesn't need to be running.** `bun run setup` links `bin/wnotes` onto PATH as `wnotes`, and either form works from any directory.

```bash
wnotes help                                   # every procedure
wnotes help todo.create                       # one procedure's inputs, types and limits
wnotes person.create --name "Alice Johnson" --title "Staff Engineer"
wnotes person.update --id <personId> --leadId <leadPersonId>
wnotes team.addMember --teamId <teamId> --personId <personId>
wnotes note.add --entityType PERSON --entityId <personId> --content "Wants to lead the migration"
wnotes todo.create --title "Book 1:1" --entityType PERSON --entityId <personId> --priority 2
wnotes report.create --entityType PERSON --entityId <personId> --title "Q3 review" --content-file q3.md
```

- **Output:** stdout is JSON (logs go to stderr). Operations return `{ "ok": true, "value": ... }` or `{ "ok": false, "error": { "message": ... } }`, and the CLI exits 1 on `ok: false`, invalid input or an unknown procedure. The error text is written to be actionable.
- **Typing:** values are coerced by each procedure's JSON Schema. `--title 2024` stays a string, `--priority 2` becomes a number, and `--leadId null` clears a field.
- **Input:** `--<field>-file <path>` reads a value from a file (use it for markdown), and `--input '<json>'` passes the whole input.
- **Entity types:** `PERSON TEAM DEPARTMENT PROJECT DOC NOTE REPORT TODO LINK TAG COMMENT EMOJI`. Docs, notes, todos, reports, links, tags, comments and emoji attach to any entity through `entityType` + `entityId`.
- **The Claude skill** in `plugin/skills/working-notes/` teaches all of this, plus recipes and the chart syntax. `bun run setup` installs it as a Claude Code plugin (see § Claude plugin).

### Importing a PDF

The app stores PDFs; it does not read them. Read the PDF yourself, write the markdown with `doc.add` and `doc.update --content-file`, and optionally attach the original with `doc.attachSource --dataBase64-file` (base64 of the PDF).

### Reports and charts

Reports are markdown with fenced `chart` blocks, rendered with the report's branding and printed to PDF from `/app/reports/<id>/print`. See `src/api/CLAUDE.md` § Reports and `plugin/skills/working-notes/references/charts.md`. Invalid chart blocks are rejected on save, and the error names the line.

## Claude plugin and MCP server

The repo is a Claude Code plugin marketplace (`.claude-plugin/marketplace.json`) with one plugin, in `plugin/`:
- the skill
- `plugin/scripts/wnotes`, the shim `.mcp.json` runs to start the server. It isn't in `bin/`: claude.ai-hosted plugins (Cowork) reject a top-level `bin/`, so `bun run setup` puts `wnotes` on PATH instead
- `plugin/.mcp.json`, which starts the `working-notes` MCP server

The shim runs the clone named by `$WORKING_NOTES_HOME`, or by `<data dir>/app-path`, which `bun run setup` writes.

- **MCP server:** `wnotes mcp` (`cli/mcp.ts`) serves every procedure as a tool over stdio, with `.` written as `_` (`person_create`), plus `backup_snapshot` and `backup_list`. It uses JSON-RPC and no SDK. The protocol is the pure `handleMessage` in `cli/mcp-protocol.ts`. Queries are marked read-only, and `delete`/`remove`/`detach` tools destructive. stdout carries protocol messages only; the app's logs go to stderr. It's stdio only: no port, no network.
- **Shared calls:** the CLI and the MCP server both call procedures through `cli/api.ts`, so new procedures need no changes in either.
- **Minimal PATH:** Claude desktop starts MCP servers with a minimal PATH. So `.mcp.json` runs the shim with `sh`, and `bin/wnotes` looks for Bun in `~/.bun/bin`, `/opt/homebrew/bin` and `/usr/local/bin` (or `$WNOTES_BUN`).
- **`bun run setup`** does four things:
  - writes the pointer
  - links `wnotes` into Bun's global bin folder
  - zips `plugin/` into `dist/working-notes.zip` for Claude desktop Chat and Cowork
  - installs or updates the Claude Code plugin

  `bun run setup uninstall` undoes that. The logic is the pure `planInstall`/`planUninstall` in `scripts/setup/plan.ts`.
- **Why a subdirectory:** the plugin's cache copy holds only the skill, the shim and `.mcp.json`. At the repo root, the whole app would be copied, including the `bin/` folder that claude.ai-hosted plugins reject.
- **Bump `version` in `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` whenever the skill or MCP config changes.** `claude plugin update` skips a version it already has.
- **No repo paths in the skill:** it uses only MCP tools and `wnotes`. `wnotes backup …` and `wnotes app` run the backup script and the dev server.

## Local state (like a native app)

- **Where it lives:** `~/Library/Application Support/Working Notes/` (`$XDG_DATA_HOME/working-notes` on Linux):
  - `working-notes.db` — SQLite, WAL mode, so the app, CLI and backups can use it at the same time
  - `files/` — uploaded PDFs and branding images
  - `Backups/` — snapshots
- **First run:** the database is created automatically. `src/shared/db/bootstrap.server.ts` runs `ensureDatabase()` at server start (`init` hook), at the start of every CLI and backup command, and in test setup. It applies pending migrations with a Prisma-compatible in-process migrator; there's no setup step.
- **Dev and prod** share this notebook. Integration tests use `./data/test` (`APP_ENV=test`) and refuse to run against anything else.

## Backups

`bun run backup` takes a snapshot only when the data changed: a consistent `VACUUM INTO` copy of the database, the files (unchanged ones hard-linked from the previous snapshot), and a `manifest.json`.

- `bun run backup install` adds an hourly LaunchAgent (`dev.jweatherby.working-notes.backup`); `uninstall` removes it. The log is `~/Library/Logs/Working Notes/backup.log`.
- `bun run backup --force --reason "<why>"` snapshots regardless. Do this before bulk or destructive changes.
- `bun run backup list` shows snapshots with counts.
- `bun run backup restore <id|latest>` refuses while the app is running on 5173, checks the snapshot's integrity, snapshots the current data first, then restores and migrates forward.
- **Retention:** everything from the last 48h, then one per day for 30 days, then one per week for 26 weeks, and always the 3 newest.
- **Snapshots stay on this disk,** so they don't protect against disk failure. Time Machine does, and it backs up Application Support automatically.

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | Dev server on http://127.0.0.1:5173 |
| `bun run build && bun run start` | Production server, loopback only |
| `bun run check` | svelte-check, plus tsc for `cli/` and `scripts/` |
| `bun run test` | Unit tests (`src/`, `cli/`, `scripts/`) |
| `bun run test:integration` | Integration tests against `./data/test` |
| `wnotes <procedure> [--field value]` | Call the API in-process (also `bin/wnotes`, `bun run wnotes`) |
| `wnotes app` | Dev server, from any directory |
| `wnotes mcp` | MCP server on stdio, for Claude desktop Chat, Cowork and Claude Code |
| `bun run backup [list\|restore\|install\|uninstall]` | Snapshots and restore (also `wnotes backup`) |
| `bun run setup [uninstall]` | Put `wnotes` on PATH, build the Claude desktop plugin zip, and install or remove the Claude Code plugin |
| `bun run db:migrate --name <change>` | Author a migration (applies to your real notebook; `bun run backup --force` first) |
| `bun run db:studio` | Prisma Studio |

## Settings

Config is plain TypeScript in `src/shared/settings/`: `base/` is client-safe and `server/` is server-only. `APP_ENV` selects `development` (default), `production` or `test`. There are no secrets and no `.env` files.

- The only server setting is `dataDir` (`server/app-dirs.ts` gives the native location).
- `server/paths.ts` derives the database, files, backups and migrations paths from it.
- Processes run from the repo root, so `prisma/migrations` resolves; the CLI changes to the repo directory itself.

## Coding conventions

- **Pure functions first.** Side effects (DB, storage, time, ids) come in through the Registry.
- **`readonly` properties** on all interfaces and return types.
- **Interfaces over type aliases** for public contracts.
- **No `any`.** Use `unknown` and narrow.
- **Explicit return types** on exported functions.
- **`Result<T>`** (`$shared/utils/result`) for operations that can fail. Don't throw in business logic.
- **No barrel re-exports from domains.** Import the file you need.
- **`const` arrow functions** over `function` declarations.
- **No code in `index.ts`.** Name files explicitly.
