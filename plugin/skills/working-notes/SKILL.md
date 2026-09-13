---
name: working-notes
description: Read and write the user's local Working Notes notebook — their org chart (people, reporting lines, teams, departments), projects, notes, docs, todos, tags, and branded reports with charts. Use whenever the user talks about the people or teams they work with, 1:1s, who reports to whom, org changes ("X moved to team Y", "Z is now X's manager"), projects, follow-ups or reminders about their work, asks you to "remember", "note", "log" or "track" something about their org, wants a report or write-up about a person, team or project, or wants a PDF imported into their notes.
---

# Working Notes

A local notebook on this computer, stored in SQLite in the user's app data folder (`~/Library/Application Support/Working Notes` on macOS, `~/.local/share/working-notes` on Linux). You are the main way data gets in. The user browses it in a web UI.

## Calling it

The notebook is reachable in two ways, and the app does **not** need to be running for either. Use whichever this session has; if it has both, use the MCP tools.

**MCP tools** from the `working-notes` server, in Claude desktop Chat, Cowork and Claude Code. Each tool is one procedure, with `_` in place of `.`: `person_list`, `person_create`, `note_add`. Pass inputs as the tool's arguments, and long text inline (there are no `-file` inputs). `backup_snapshot` and `backup_list` handle snapshots.

**The `wnotes` CLI**, in a shell:

```bash
wnotes help                    # every procedure
wnotes help person.create      # one procedure's inputs, types and limits
wnotes person.list
wnotes person.create --name "Dana Park" --title "Senior Engineer"
```

- If the shell says `wnotes: command not found`, this Claude Code version doesn't put plugin commands on PATH. Call the clone's CLI through the pointer file that setup writes, and use it wherever this skill says `wnotes`:
  - macOS: `"$(cat "$HOME/Library/Application Support/Working Notes/app-path")/bin/wnotes"`
  - Linux: `"$(cat "${XDG_DATA_HOME:-$HOME/.local/share}/working-notes/app-path")/bin/wnotes"`
- If neither the tools nor `wnotes` work, or they say Working Notes isn't set up, tell the user what you saw and stop. Setup is theirs to run: clone the Working Notes repo, then `bun install` and `bun run setup` in it.
- stdout is JSON. Most calls return `{"ok": true, "value": ...}` or `{"ok": false, "error": {"message": ...}}`. Exit code 1 means failure; read the message and fix the call.
- Values are typed by each procedure's schema: `--priority 2` is a number, `--title 2024` stays a string, and `--leadId null` clears a field.
- For long text, write it to a file and pass `--content-file path.md` (any `--<field>-file`). For awkward input, pass `--input '{"...": ...}'`.

## Rules

1. **Look before you write.** Find ids with `person.list`, `team.list`, `department.list` and `project.list`. Match names case-insensitively, and never create a second person, team or project with a name that already exists.
2. **Ask when it's ambiguous.** For example, two people match "Sam", or it's unclear which project a note belongs to.
3. **Confirm before deleting anything**, and say exactly what will be removed.
4. **Snapshot before bulk or destructive changes.** That means any delete, or more than about five writes in one go:
   `backup_snapshot` with a reason like "before <what>", or `wnotes backup --force --reason "before <what>"`
5. **Report back by name.** Say "Added Dana Park to Platform, reporting to Alice Johnson", not ids.
6. **Keep the user's words.** A note records what they said. Don't embellish or summarise it unless asked.

## Recipes

These use CLI syntax. With MCP tools, `person.create --name "Dana Park"` is `person_create` with `{"name": "Dana Park"}`.

| The user says | Do |
|---|---|
| "Dana joined as a senior engineer" | `person.create --name "Dana Park" --title "Senior Engineer"` |
| "Dana reports to Alice" | `person.update --id <dana> --leadId <alice>` |
| "Dana is on Platform" | `team.addMember --teamId <platform> --personId <dana>` (people can be on several teams) |
| "Dana moved from Platform to Payments" | `team.removeMember` from Platform, then `team.addMember` to Payments |
| "Dana is in Engineering" | `department.addMember --departmentId <eng> --personId <dana>` (one department per person; this replaces the old one) |
| "Note that Dana wants to lead the migration" | `note.add --entityType PERSON --entityId <dana> --content "..."` |
| "Remind me to book a 1:1 with Dana" | `todo.create --title "Book 1:1 with Dana" --entityType PERSON --entityId <dana>` (optional `--priority 0-3`, `--targetDate 2026-10-01`) |
| "That's done" | `todo.update --id <todo> --status COMPLETE` |
| "Start a project for the Q4 migration" | `project.create --name "Q4 migration" --status active` (optional `--parentId`, `--startDate`, `--daysLikely`) |
| "Tag Dana as high-potential" | `tag.list`, then `tag.create --name high-potential` if it's missing, then `tag.attach --tagId <tag> --entityType PERSON --entityId <dana>` |
| "What do I know about Dana?" | `person.get`, then `note.list`, `todo.forEntity`, `doc.list` and `report.forEntity` for `PERSON <dana>` |

Entity types for notes, docs, todos, reports, links and tags: `PERSON TEAM DEPARTMENT PROJECT`. They also accept `DOC NOTE REPORT TODO LINK TAG COMMENT EMOJI`. The full data model is in [references/schema.md](references/schema.md).

## Reports

Reports are markdown, attached to a person, team, department or project, with optional charts, and printed with the user's branding.

1. Gather the facts first (`person.get`, `note.list`, `todo.forEntity`, and so on). Don't invent numbers; ask for them if they're missing.
2. Write the markdown. Add charts as fenced `chart` blocks; the syntax is in [references/charts.md](references/charts.md).
3. `wnotes report.create --entityType TEAM --entityId <id> --title "Q3 review" --content-file /tmp/q3.md`, or `report_create` with the markdown as `content`.
4. If a chart is invalid, the error names the line (`chart block at line 12: series.0.values has 2 values but there are 3 labels`). Fix it, then `wnotes report.update --id <report> --content-file /tmp/q3.md`.
5. Tell the user where to view it. They start the app with `wnotes app` and open `http://127.0.0.1:5173/app/reports/<id>`. The print/PDF view is `/app/reports/<id>/print`.

## Importing a PDF

The app stores PDFs but can't read them; you do the reading.

1. Read the PDF and convert it to clean markdown, keeping headings, lists and tables.
2. `wnotes doc.add --entityType PERSON --entityId <id> --title "<title>"`, then `wnotes doc.update --id <doc> --content-file /tmp/doc.md`
3. To keep the original attached, when you have a shell: `base64 -i file.pdf > /tmp/pdf.b64`, then `wnotes doc.attachSource --docId <doc> --contentType application/pdf --dataBase64-file /tmp/pdf.b64`

## Backups

Snapshots are kept on this computer in the `Backups` folder next to the notebook. On macOS they're taken hourly, when something changed, if the user ran `wnotes backup install`.

- `backup_list`, or `wnotes backup list`
- Restore **only when the user asks**, and only from a shell: `wnotes backup restore <id|latest>`. The app must be closed. Restore snapshots the current data first, so it can be undone. Without a shell, give the user that command to run.
