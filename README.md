# Working Notes

A local-only, single-user structured notebook — org chart, projects, notes, docs, todos and branded reports with charts — built to be driven by Claude.

- **Local:** your notebook lives in your app data folder (`~/Library/Application Support/Working Notes` on macOS, `~/.local/share/working-notes` on Linux). The server binds to 127.0.0.1, and there are no accounts, cloud or API keys.
- **Claude-first:** Claude reads and writes through the `wnotes` CLI or its local MCP server, both of which call the app's validated API in-process. The app doesn't need to be running.
- **Backed up:** hourly snapshots when something changed, kept on this computer (macOS).
- **Viewable:** a SvelteKit UI for browsing the org map and entities, editing reports, and printing them to PDF.

## Getting started

You need [Bun](https://bun.sh). Claude Code and the Claude desktop app are optional.

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

- **Update:** `git pull && bun install && bun run setup`, then re-add the zip in Claude desktop.
- **Moved the clone?** Run `bun run setup` again from the new location.
- **Uninstall:** `bun run setup uninstall`. Your notebook data is not touched.
- **Other MCP clients:** run `wnotes mcp` as a stdio server.

Snapshots stay on this disk; turn on Time Machine (or your own backups) to protect against losing the disk itself. See `CLAUDE.md` for conventions, the CLI, backups and the report chart format.
