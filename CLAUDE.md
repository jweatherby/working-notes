# CLAUDE.md — Working Notes

A local-only, single-user structured notebook: an org chart (people, teams, departments), projects, notes, docs, todos, tags, and branded reports with charts. A more opinionated Obsidian, backed by SQLite.

The user keeps several **notebooks** (work, a side project), each with its own database and files. The app, the CLI and the MCP server work on one notebook at a time.

**Claude is the primary way data gets in**, through the CLI, which calls the app's tRPC API. The web UI is mainly for looking at the data (usually in the Claude desktop browser pane) and for printing reports to PDF.

Scoped docs:

- `src/api/CLAUDE.md`: domains, the Registry, Result, tRPC, reports and the chart spec
- `src/lib/CLAUDE.md`: components, stores, chart rendering, SCSS
- `src/routes/CLAUDE.md`: routes, the files route, print pages
- `prisma/CLAUDE.md`: SQLite schema conventions and migrations
- `tests/CLAUDE.md`: unit and integration tests

## Ground rules

- **Local-only, single user.** There are no users, auth, orgs, permissions or sharing. Don't add them.
- **Notebooks are separate databases, not tenants.** No table has a notebook column, and nothing reads or links across notebooks. Keep it that way: a feature that needs two notebooks at once needs a different design.
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
wnotes goal.create --title "99.9% uptime" --ownerType TEAM --ownerId <teamId> --period 2026-H2 --target 99.9
wnotes goal.checkIn --goalId <goalId> --value 99.7 --status AT_RISK
wnotes page.create --title "Datadog" --kind SOFTWARE --properties '{"vendor":"Datadog","seats":40}'
wnotes relation.add --fromType TEAM --fromId <teamId> --toType PAGE --toId <pageId> --kind USES --note "Alerting"
```

- **Output:** stdout is JSON (logs go to stderr). Operations return `{ "ok": true, "value": ... }` or `{ "ok": false, "error": { "message": ... } }`, and the CLI exits 1 on `ok: false`, invalid input or an unknown procedure. The error text is written to be actionable.
- **Notebooks:** every call runs against the default notebook, unless it passes `--notebook <id or name>` (anywhere in the arguments) or `WNOTES_NOTEBOOK` is set. `notebook.list`, `notebook.create --name`, `notebook.rename` and `notebook.setDefault` manage them. There is deliberately no delete: the user moves a folder out of `Notebooks/` by hand.
- **Typing:** values are coerced by each procedure's JSON Schema. `--title 2024` stays a string, `--priority 2` becomes a number, and `--leadId null` clears a field.
- **Input:** `--<field>-file <path>` reads a value from a file (use it for markdown), and `--input '<json>'` passes the whole input.
- **Entity types:** `PERSON TEAM DEPARTMENT PROJECT GOAL PAGE DOC NOTE REPORT TODO LINK TAG COMMENT EMOJI`. Docs, notes, todos, reports, links, tags, comments and emoji attach to any entity through `entityType` + `entityId`, except docs on wiki pages (`acceptsDocs` in `src/shared/utils/entity.ts`).
- **Links between entities:** projects and goals have an owner (`ownerType` + `ownerId`). `relation.add` links any two entities with a kind and a note. A markdown link to an app path (`/app/wiki/<id>`) in page, doc, note or report content becomes a `MENTIONS` backlink when the content is saved.
- **The Claude skill** in `plugin/skills/working-notes/` teaches all of this, plus recipes and the chart syntax. `bun run setup` installs it as a Claude Code plugin (see § Claude plugin).

### Importing a PDF

The app stores PDFs; it does not read them. Read the PDF yourself, write the markdown with `doc.add` and `doc.update --content-file`, and optionally attach the original with `doc.attachSource --dataBase64-file` (base64 of the PDF).

### Reports and charts

**Reports are switched off while they're unfinished:** `features.reports` in `src/shared/settings/base/features.ts`. Off, the UI hides them (nav, finder, sidebar widget, home feed and graph), `/app/reports` is a 404, and `report.*` is left out of the CLI and MCP. The router, tables and data stay. To turn them back on, set the flag and restore the Reports section of the skill (`plugin/skills/working-notes/SKILL.md`, `references/schema.md`) and "reports" in the MCP instructions (`cli/mcp.ts`).

Reports are markdown with fenced `chart` blocks, rendered with the report's branding and printed to PDF from `/app/reports/<id>/print`. See `src/api/CLAUDE.md` § Reports and `plugin/skills/working-notes/references/charts.md`. Invalid chart blocks are rejected on save, and the error names the line.

## Claude plugin and MCP server

The repo is a Claude Code plugin marketplace (`.claude-plugin/marketplace.json`) with one plugin, in `plugin/`:
- the skill
- `plugin/scripts/wnotes`, the shim `.mcp.json` runs to start the server. It isn't in `bin/`: claude.ai-hosted plugins (Cowork) reject a top-level `bin/`, so `bun run setup` puts `wnotes` on PATH instead
- `plugin/.mcp.json`, which starts the `working-notes` MCP server

The shim runs, in order: the clone named by `$WORKING_NOTES_HOME`; the clone in `<data dir>/app-path`, which `bun run setup` writes (so a development machine runs its own code); or the standalone binary a release carries (see § Releases).

- **MCP server:** `wnotes mcp` (`cli/mcp.ts`) serves every procedure as a tool over stdio, with `.` written as `_` (`person_create`), plus `backup_snapshot` and `backup_list`. Every tool except `notebook_*` takes an optional `notebook` argument, which `callTool` strips before the call. It uses JSON-RPC and no SDK. The protocol is the pure `handleMessage` in `cli/mcp-protocol.ts`. Queries are marked read-only, and `delete`/`remove`/`detach` tools destructive. stdout carries protocol messages only; the app's logs go to stderr. It's stdio only: no port, no network.
- **Shared calls:** the CLI and the MCP server both call procedures through `cli/api.ts`, so new procedures need no changes in either.
- **Minimal PATH:** Claude desktop starts MCP servers with a minimal PATH. So `.mcp.json` runs the shim with `sh`, and `bin/wnotes` looks for Bun in `~/.bun/bin`, `/opt/homebrew/bin` and `/usr/local/bin` (or `$WNOTES_BUN`).
- **`bun run setup`** does four things:
  - writes the pointer
  - links `wnotes` into Bun's global bin folder
  - zips `plugin/` into `dist/working-notes.zip` for Claude desktop Chat and Cowork
  - installs or updates the Claude Code plugin

  `bun run setup uninstall` undoes that. The logic is the pure `planInstall`/`planUninstall` in `scripts/setup/plan.ts`.
- **Why a subdirectory:** the plugin's cache copy holds only the skill, the shim and `.mcp.json`. At the repo root, the whole app would be copied, including the `bin/` folder that claude.ai-hosted plugins reject.
- **Bump the version with `bun run release:version <x.y.z>` whenever the plugin should update.** It sets `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` together. `claude plugin update` and Cowork skip a version they already have.
- **No repo paths in the skill:** it uses only MCP tools and `wnotes`. `wnotes backup …` and `wnotes app` run the backup script and the dev server.

## Releases

Releases include the app, so a Mac that installs the plugin needs no clone and no Bun. `main` is where development happens.

- **Releasing:** run `bun run release:version <x.y.z>`, commit and push to main. After CI passes, `.github/workflows/release.yml` publishes it. `scripts/release/plan.ts` skips a version that's already released, and fails if `plugin/` changed since the last release without a new version.
- **CI** (`.github/workflows/ci.yml`): `check`, unit and integration tests on every push and pull request.
- **Build** (`bun run release:build`, `scripts/release/build.ts`): builds the UI, then compiles `cli/standalone.ts` and the built SvelteKit server into one `wnotes` binary with Bun embedded (Apple silicon, `darwin-arm64`). It writes `dist/plugin/` (the plugin plus `server/`: the binary, `client/`, `migrations/`, `VERSION`) and `dist/working-notes-<version>-darwin-arm64.zip`.
- **Smoke test** (`bun run release:smoke`, `scripts/release/smoke.ts`): installs through the shim into an empty home folder, then checks a procedure, the MCP tool list and the app (page, asset, API, guard).
- **Publish:** force-pushes the contents of `dist/plugin` to the root of the `dist` branch (Cowork's sync requires `.claude-plugin/plugin.json` at the root and ignores a source `path`), then creates GitHub release `v<version>` with the zip (for Claude desktop Chat, which only takes uploads).
- **marketplace.json** points the plugin at that branch: `"source": {"source": "github", "repo": …, "ref": "dist"}`. So Claude Code, Cowork and `bun run setup` all install the released plugin; a development machine's MCP server still runs its clone (shim order above).
- **The binary:** `cli/standalone.ts` sets `WNOTES_STANDALONE` and `WNOTES_MIGRATIONS_DIR`, then runs `mcp`, `backup`, `app` (`cli/app-server.ts`: the SvelteKit server plus static files, on 127.0.0.1:5173) or a procedure. `cli/main.ts` and `cli/mcp.ts` don't chdir to a repo when `WNOTES_STANDALONE` is set.
- **Native SQLite:** libsql picks its native module with a runtime `require`, which a bundler can't follow. `scripts/release/libsql.ts` rewrites it into a static require so Bun embeds the module, and fails the build if libsql changes that line.
- **Cowork:** sessions run in a sandbox (a VM on the Mac, or the cloud) that can't see `~/Library/Application Support`. Claude desktop runs the plugin's MCP server on the Mac and bridges its tools into local sessions only, so the tools are the only way in. The skill and the MCP instructions tell Claude never to read the data folder, run `wnotes` from a sandbox, or ask for the folder to be attached; a SQLite database opened from both the VM and the Mac isn't safe.
- **On the user's Mac:** the shim copies the binary (with `cat`, which drops a download quarantine flag), `client/` and `migrations/` into `<data dir>/App/<version>`, and points `App/current` at it. `wnotes backup install` from a release makes the LaunchAgent run `App/current/wnotes backup`, which keeps working across updates. The MCP tool `app_open` starts the app in the background.

## Local state (like a native app)

- **Where it lives:** `~/Library/Application Support/Working Notes/` (`$XDG_DATA_HOME/working-notes` on Linux):
  - `settings.json` — `defaultNotebook`, the notebook the CLI and MCP use when none is named
  - `Notebooks/<id>/notebook.json` — the notebook's name
  - `Notebooks/<id>/working-notes.db` — SQLite, WAL mode, so the app, CLI and backups can use it at the same time
  - `Notebooks/<id>/files/` — uploaded PDFs and branding images
  - `Backups/<id>/` — that notebook's snapshots, outside its folder so they outlive it
  - `app-path` — the clone `bun run setup` points the plugin at
- **Which notebook:** `resolveNotebook` (`src/shared/notebooks/resolve.ts`, pure). The CLI and MCP use the named notebook, then `WNOTES_NOTEBOOK`, then the default. The UI uses `?notebook=<id>`, then its `wn-notebook` cookie, then the default, so switching in the browser never changes where Claude writes.
- **First run:** nothing to set up. `ensureLayout()` (`src/shared/notebooks/layout.server.ts`) runs before any database opens. A fresh data directory gets a notebook called `notebook`. A data directory from before notebooks (a `working-notes.db` at the top) is moved, by renames only, into the notebook `work-work`, snapshots included. It refuses while another process (the old app, an MCP server) has that database open. Then `ensureDatabase(notebookId)` (`src/shared/db/bootstrap.server.ts`) applies pending migrations with a Prisma-compatible in-process migrator, the first time each process touches each notebook.
- **Dev and prod** share these notebooks. Integration tests use `./data/test` (`APP_ENV=test`) and refuse to run against anything else.

## Backups

`bun run backup` snapshots each notebook whose data changed: a consistent `VACUUM INTO` copy of its database, its files (unchanged ones hard-linked from the previous snapshot), and a `manifest.json` naming the notebook. Add `--notebook <id>` to `run`, `list` or `restore` to work on one.

- `bun run backup install` adds one hourly LaunchAgent (`dev.jweatherby.working-notes.backup`) for every notebook; `uninstall` removes it. The log is `~/Library/Logs/Working Notes/backup.log`.
- `bun run backup --force --reason "<why>"` snapshots regardless. Do this before bulk or destructive changes.
- `bun run backup list` shows snapshots with counts, per notebook.
- `bun run backup restore <id|latest> --notebook <id>` refuses while the app is running on 5173, checks the snapshot's integrity, snapshots the current data first, then restores and migrates forward. `--notebook` may be left out only when there is one notebook.
- **Retention:** per notebook, everything from the last 48h, then one per day for 30 days, then one per week for 26 weeks, and always the 3 newest.
- **Snapshots stay on this disk,** so they don't protect against disk failure. Time Machine does, and it backs up Application Support automatically.

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | Dev server on http://127.0.0.1:5173 |
| `bun run build && bun run start` | Production server, loopback only |
| `bun run check` | svelte-check, plus tsc for `cli/` and `scripts/` |
| `bun run test` | Unit tests (`src/`, `cli/`, `scripts/`) |
| `bun run test:integration` | Integration tests against `./data/test` |
| `wnotes <procedure> [--field value] [--notebook <id>]` | Call the API in-process (also `bin/wnotes`, `bun run wnotes`) |
| `wnotes app` | Dev server, from any directory |
| `wnotes mcp` | MCP server on stdio, for Claude desktop Chat, Cowork and Claude Code |
| `bun run backup [list\|restore\|install\|uninstall] [--notebook <id>]` | Snapshots and restore (also `wnotes backup`) |
| `bun run release:version <x.y.z>` | Set the plugin version; pushing it to main releases it |
| `bun run release:build` / `release:smoke` | Build the standalone plugin into `dist/` and smoke-test it |
| `bun run setup [uninstall]` | Put `wnotes` on PATH, build the Claude desktop plugin zip, and install or remove the Claude Code plugin |
| `bun run db:migrate --name <change>` | Author a migration against the default notebook, or `WNOTES_NOTEBOOK` (a real notebook; `bun run backup --force` first). Other notebooks migrate forward when next opened |
| `bun run db:studio` | Prisma Studio, on the same notebook |

## Settings

Config is plain TypeScript in `src/shared/settings/`: `base/` is client-safe and `server/` is server-only. `APP_ENV` selects `development` (default), `production` or `test`. There are no secrets and no `.env` files.

- The only server setting is `dataDir` (`server/app-dirs.ts` gives the native location).
- `server/paths.ts` derives every path from it. Per-notebook paths take the notebook id and throw on an id that isn't a valid slug (`isNotebookId`), so an id can never become a path outside `Notebooks/`.
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
- **UI uses the standard components.** Pages, forms, popups, destructive actions, empty states and styles follow `src/lib/CLAUDE.md` § Rules for UI code. Extend a primitive in `src/lib/ui/`; don't write a one-off.
