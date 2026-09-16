# Install

Working Notes runs on your own Mac. A release contains the application itself, so Claude is the
only thing you need beforehand. Releases are built for Apple silicon.

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

Download `working-notes-<version>-darwin-arm64.zip` from the
[latest release](https://github.com/jweatherby/working-notes/releases/latest) and add it as a
plugin. Repeat with each new release — Chat takes uploads only.

## First run

The first time Claude starts the plugin, it installs the app into
`~/Library/Application Support/Working Notes/App`, and creates a notebook called `notebook`. Your
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

## Hourly backups

```bash
"$HOME/Library/Application Support/Working Notes/App/current/wnotes" backup install
```

This adds a LaunchAgent that snapshots every notebook hourly, when something changed. It keeps
working across app updates. The log is `~/Library/Logs/Working Notes/backup.log`, and `backup
uninstall` removes it.

Snapshots live on this disk, so they don't protect against losing the disk. Time Machine does, and
it backs up Application Support automatically.

## Where your data lives

`~/Library/Application Support/Working Notes/` (`$XDG_DATA_HOME/working-notes` on Linux):

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

**The app is stuck, or shows an old version.** Run `wnotes app restart`. It stops the running app,
whatever version it is, and starts the current one. Claude can do the same with its `app_restart`
tool.

**Claude does not have the Working Notes tools.** Install the plugin, then start a *new* session. In
Cowork, the session must also be running on your Mac with Claude desktop open, because a cloud
session cannot run a local MCP server.

**You see "database is locked".** Another program has the notebook open. Close the app, and any
other `wnotes` process, then try again.
