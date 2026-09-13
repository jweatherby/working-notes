# Working Notes

A local-only, single-user structured notebook — org chart, projects, notes, docs, todos and branded reports with charts — built to be driven by Claude.

- **Local:** your notebooks live in your app data folder (`~/Library/Application Support/Working Notes` on macOS, `~/.local/share/working-notes` on Linux). The server binds to 127.0.0.1, and there are no accounts, cloud or API keys.
- **Separate notebooks:** keep work and each personal project apart. Each notebook has its own database and files; switch in the top bar, or pass `--notebook` to `wnotes`.
- **Claude-first:** Claude reads and writes through the `wnotes` CLI or its local MCP server, both of which call the app's validated API in-process. The app doesn't need to be running.
- **Backed up:** hourly snapshots when something changed, kept on this computer (macOS).
- **Viewable:** a SvelteKit UI for browsing the org map and entities, editing reports, and printing them to PDF.

## Install on a Mac (no clone needed)

Each release includes the app, so a Mac only needs Claude. Releases are built for Apple silicon.

- **Claude Code:** `claude plugin marketplace add jweatherby/working-notes`, then `claude plugin install working-notes@working-notes`. To update: `claude plugin marketplace update working-notes && claude plugin update working-notes@working-notes`, or turn on auto-update for the marketplace in `/plugin`. The repo is private, so Claude Code needs git access to it; for background auto-update, use SSH.
- **Cowork:** Customize → **+** → **Add marketplace from GitHub** → `jweatherby/working-notes`, then install Working Notes.
- **Claude desktop Chat:** download `working-notes-<version>-darwin-arm64.zip` from the [latest release](https://github.com/jweatherby/working-notes/releases/latest) and add it as a plugin. Repeat with each new release.

The first time Claude starts the plugin, it installs the app into `~/Library/Application Support/Working Notes/App`. Your notebooks stay in that folder across updates.

- **The UI:** ask Claude to "open Working Notes", or run `~/Library/Application\ Support/Working\ Notes/App/current/wnotes app` and go to http://127.0.0.1:5173/app.
- **Hourly backups:** `~/Library/Application\ Support/Working\ Notes/App/current/wnotes backup install`.

## Develop from a clone

You need [Bun](https://bun.sh). Claude Code and the Claude desktop app are optional. On a machine where `bun run setup` has run, the plugin's MCP server runs this clone's code instead of the release's.

```bash
git clone <repo-url> working-notes
cd working-notes
bun install
bun run setup              # put `wnotes` on PATH and install the Claude plugin
wnotes backup install      # optional, macOS: hourly local snapshots
wnotes app                 # optional: the UI at http://127.0.0.1:5173
```

The database is created on first use. Try the CLI:

```bash
wnotes help
wnotes person.create --name "Alice Johnson" --title "Staff Engineer"
```

Or tell Claude something like "Dana Park joined Platform as a senior engineer, reporting to Alice".

## Using it from Claude

`bun run setup` links `wnotes` into Bun's global bin folder (`~/.bun/bin`) and records where this clone is. It also does two things for Claude:

- **Claude Code:** it adds this clone as a local plugin marketplace and installs the `working-notes` plugin. The plugin holds the skill, which teaches Claude the notebook, and the `working-notes` MCP server. Start a new session to use them.
- **Claude desktop, Chat and Cowork:** it builds `dist/working-notes.zip`, the same plugin packaged for upload. Add it as a plugin in the desktop app. The MCP server runs on your Mac as `wnotes mcp`, so the notebook still never leaves it. claude.ai on the web can't reach it.

Setup is safe to re-run.

- **Update:** `git pull && bun install && bun run setup`.
- **Release:** `bun run release:version <x.y.z>`, then commit and push to main. After CI passes, GitHub Actions builds the standalone plugin, publishes it to the `dist` branch for Claude Code and Cowork, and attaches the zip for Chat to a GitHub release.
- **Moved the clone?** Run `bun run setup` again from the new location.
- **Uninstall:** `bun run setup uninstall`. Your notebook data is not touched.
- **Other MCP clients:** run `wnotes mcp` as a stdio server.

Snapshots stay on this disk; turn on Time Machine (or your own backups) to protect against losing the disk itself. See `CLAUDE.md` for conventions, the CLI, backups and the report chart format.
