# Install

Working Notes runs on your own computer. A release contains the application itself, so Claude is
the only thing you need beforehand. Releases are built for Macs with Apple silicon, and, as a
preview, for Windows (x64) and Linux (x64).

To work on the code instead, read [DEVELOPMENT.md](DEVELOPMENT.md).

## Install the plugin

Follow the instructions for the Claude you use. All three install the same plugin, which contains
two things: a skill that teaches Claude how the notebook works, and an MCP server that lets Claude
read and write it.

**Claude Code**

```bash
claude plugin marketplace add jweatherby/working-notes
```

```bash
claude plugin install working-notes@working-notes
```

To update:

```bash
claude plugin marketplace update working-notes && claude plugin update working-notes@working-notes
```

Or turn on auto-update for the marketplace in `/plugin`. The repo is private, so Claude Code needs
git access to it; for background auto-update, use SSH.

**Cowork**

Customize → **+** → **Add marketplace from GitHub** → `jweatherby/working-notes`, then install
Working Notes. Uploading the release zip works too, as for Chat.

Start Cowork sessions **on your Mac, not in the cloud**, and keep Claude desktop open. A Cowork
session runs in a sandbox that cannot see `~/Library/Application Support`, so the plugin's tools are
the only route to your notebooks. Claude desktop runs those tools on your Mac for local sessions.

Do not attach the data folder to a session. Two programs must never open the same database at once.

**Claude desktop Chat**

Download `working-notes-<version>-darwin-arm64.zip` (`-windows-x64` or `-linux-x64` on those
systems) from the
[latest release](https://github.com/jweatherby/working-notes/releases/latest) and add it as a
plugin. Repeat with each new release — Chat takes uploads only.

**Windows (preview)**

The plugin starts its server with `sh`, which Windows doesn't have unless Git Bash is on your
PATH; Claude's plugin settings can't name a different command per system yet. The simplest way
round it is the desktop app (below): install it, then choose **Claude → Connect to Claude desktop**
or **Connect to Claude Code**. Or add the server yourself after installing the plugin, pointing at
the Windows launcher inside it:

```powershell
claude mcp add working-notes -- cmd /d /c "<plugin folder>\scripts\wnotes.cmd" mcp
```

In Claude desktop, the same goes in `claude_desktop_config.json` under `mcpServers`, as
`"command": "cmd"` with `"args": ["/d", "/c", "<plugin folder>\\scripts\\wnotes.cmd", "mcp"]`.
The launcher installs the app into `%LOCALAPPDATA%\Working Notes\App` and runs it from there.

## First run

The first time Claude starts the plugin, it installs the app into the `App` folder of your data
folder (see [Where your data lives](#where-your-data-lives)), and creates a notebook called
`notebook`. Your
notebooks stay in that folder across updates.

Nothing else to set up. Try it by telling Claude something like *"Dana Park joined Platform as a
senior engineer, reporting to Alice"*.

## The app

Ask Claude to "open Working Notes" and it will start the app and hand you the link. By hand:

```bash
"$HOME/Library/Application Support/Working Notes/App/current/wnotes" app
```

Then go to http://127.0.0.1:5173/app. The server binds to 127.0.0.1 and refuses any request that
didn't come from this machine.

## The desktop app (preview)

A desktop app for macOS, Windows and Linux opens Working Notes in a window of its own. It brings
the same app with it, starts it when you open the window, and leaves it running for Claude when you
close it. Its **Claude** menu connects Working Notes to Claude desktop or Claude Code, for when you
don't use the plugin (on Windows, for now, you need it). Each asks before changing Claude's
settings.

The installers aren't signed yet, so macOS and Windows warn before opening them. Builds are in the
**Desktop** workflow's artifacts on GitHub.

## Install it as a Mac app

The web app can be installed as a desktop app, so it gets its own Dock icon and its own window with
no browser chrome. It still runs entirely on your machine, against the same local server.

Start the app first, then:

- **Chrome or Edge:** open http://127.0.0.1:5173/app, then choose **Install Working Notes** — from
  the install icon at the right of the address bar, or from the ⋮ menu under **Cast, save and
  share**.
- **Safari 17 or later:** open the same address, then **File → Add to Dock**.

The installed app opens at `/app` and shares the browser's cookies, so it remembers which notebook
you were in. To remove it, open `chrome://apps`, right-click Working Notes and choose **Remove**;
in Safari, delete it from the Applications folder.

The window shows an error page whenever the server is not running. Start it again the usual way —
ask Claude to open Working Notes, or run `wnotes app` — and reload.

## Hourly backups

Working Notes snapshots every notebook that changed, once an hour, whenever Claude or the app is
open, on every system. There's nothing to set up.

On a Mac you can also add a LaunchAgent, so backups carry on while neither is running:

```bash
"$HOME/Library/Application Support/Working Notes/App/current/wnotes" backup install
```

The LaunchAgent snapshots every notebook hourly, when something changed, and keeps working across
app updates. It shares the hour with Claude and the app, so nothing is snapshotted twice. The log is `~/Library/Logs/Working Notes/backup.log`, and `backup
uninstall` removes it.

Snapshots live on this disk, so they don't protect against losing the disk. Time Machine does on a
Mac, and it backs up Application Support automatically; on Windows and Linux, use the system's own
backup.

## Where your data lives

`~/Library/Application Support/Working Notes/` on a Mac, `%LOCALAPPDATA%\Working Notes\` on
Windows, and `$XDG_DATA_HOME/working-notes` (usually `~/.local/share/working-notes`) on Linux:

| | |
|---|---|
| `Notebooks/<id>/working-notes.db` | the notebook's SQLite database |
| `Notebooks/<id>/files/` | uploaded PDFs and branding images |
| `Backups/<id>/` | that notebook's snapshots, kept outside its folder so they outlive it |
| `settings.json` | which notebook is the default |

## Troubleshooting

**`wnotes: command not found`.** The command is only on your PATH if you ran `bun run setup` from a
clone. From a release, use the full path:

```bash
"$HOME/Library/Application Support/Working Notes/App/current/wnotes" help
```

On Windows: `& "$env:LOCALAPPDATA\Working Notes\App\current\wnotes.exe" help`. On Linux:
`~/.local/share/working-notes/App/current/wnotes help`.

**The app is stuck, or shows an old version.** Run `wnotes app restart`. It stops the running app,
whatever version it is, and starts the current one. Claude can do the same with its `app_restart`
tool.

**Claude does not have the Working Notes tools.** Install the plugin, then start a *new* session. In
Cowork, the session must also be running on your Mac with Claude desktop open, because a cloud
session cannot run a local MCP server.

**You see "database is locked".** Another program has the notebook open. Close the app, and any
other `wnotes` process, then try again.
