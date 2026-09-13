---
name: working-notes
description: Read and write the user's local Working Notes notebooks (separate ones for work and for personal projects) — their org chart (people, reporting lines, teams, departments), projects and who owns them, goals with targets and check-ins, a wiki of pages (policies, products, software, decisions), relations between any of these, notes, docs, todos, tags, and branded reports with charts. Use whenever the user talks about the people or teams they work with, 1:1s, who reports to whom, org changes ("X moved to team Y", "Z is now X's manager"), projects, goals, OKRs, targets or progress ("we're at 80%", "that goal is at risk"), policies, products, the software or vendors they use, decisions, wiki pages, links between things ("link X to Y", "X depends on Y", "team X uses Y"), follow-ups or reminders about their work, asks you to "remember", "note", "log" or "track" something about their org, wants a report or write-up about a person, team, project or goal, or wants a PDF imported into their notes.
---

# Working Notes

Local notebooks on this computer, stored in SQLite in the user's app data folder (`~/Library/Application Support/Working Notes` on macOS, `~/.local/share/working-notes` on Linux). Each notebook (their work, a side project) has its own people, projects, notes and files, and nothing is shared between notebooks. You are the main way data gets in. The user browses them in a web UI.

## Calling it

The notebooks are reachable in two ways, and the app does **not** need to be running for either. Use whichever this session has; if it has both, use the MCP tools.

**MCP tools** from the `working-notes` server, in Claude desktop Chat, Cowork and Claude Code. Each tool is one procedure, with `_` in place of `.`: `person_list`, `person_create`, `note_add`. Pass inputs as the tool's arguments, and long text inline (there are no `-file` inputs). Every tool except `notebook_*` also takes an optional `notebook`. `backup_snapshot` and `backup_list` handle snapshots, and `app_open` starts the app on this computer and returns its link.

**The `wnotes` CLI**, in a shell:

```bash
wnotes help                    # every procedure
wnotes help person.create      # one procedure's inputs, types and limits
wnotes person.list
wnotes person.create --name "Dana Park" --title "Senior Engineer"
```

- If the shell says `wnotes: command not found`, use the first of these that exists, wherever this skill says `wnotes`:
  - the app a release installed: `"$HOME/Library/Application Support/Working Notes/App/current/wnotes"`
  - a clone set up with `bun run setup`: `"$(cat "$HOME/Library/Application Support/Working Notes/app-path")/bin/wnotes"` (on Linux, `"$(cat "${XDG_DATA_HOME:-$HOME/.local/share}/working-notes/app-path")/bin/wnotes"`)
- If neither the tools nor `wnotes` work, or they say Working Notes isn't set up, tell the user what you saw and stop. Setup is theirs to do: install the Working Notes plugin from a release, which includes the app.
- stdout is JSON. Most calls return `{"ok": true, "value": ...}` or `{"ok": false, "error": {"message": ...}}`. Exit code 1 means failure; read the message and fix the call.
- Values are typed by each procedure's schema: `--priority 2` is a number, `--title 2024` stays a string, and `--leadId null` clears a field.
- For long text, write it to a file and pass `--content-file path.md` (any `--<field>-file`). For awkward input, pass `--input '{"...": ...}'`.

## Notebooks

Every call works on one notebook: the default, unless you name another.

- **Start with `notebook.list`** (`notebook_list`). It shows each notebook's id and name, and marks the default.
- **Pick the notebook the user means.** Their job belongs in their work notebook, and a side project in its own. If there's more than one notebook and you can't tell, ask.
- **Name it on the call** to use a notebook other than the default: `--notebook <id or name>` on any CLI call, or `notebook` in any tool's arguments. Keep passing it for every call in that notebook, lookups included.
- **Ids don't carry across notebooks.** Look people, teams and projects up in the notebook you're writing to.
- **Say which notebook** you read or wrote when there's more than one: "Added Dana Park to Platform, in Work".
- `notebook.create --name "Garden"` makes a notebook; its id comes from the name, or pass `--id`. `notebook.setDefault --id <id>` changes the default for every later call, so do it only when the user asks. There is no delete: the user removes a notebook themselves.

## Rules

1. **Look before you write**, in the notebook you're writing to. Find ids with `person.list`, `team.list`, `department.list`, `project.list`, `goal.list` and `page.list`. Match names and titles case-insensitively. Never create a second person, team or project with a name that already exists, or a second goal or page with a title that already exists.
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
| "Start a notebook for my garden project" | `notebook.list`, then `notebook.create --name "Garden"` if there isn't one |
| "In my garden notebook, remind me to order seeds" | `todo.create --title "Order seeds" --notebook garden` (look up any ids with `--notebook garden` too) |
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
| "What do I know about Dana?" | `person.get`, then `note.list`, `todo.forEntity`, `doc.list`, `report.forEntity` and `relation.forEntity` for `PERSON <dana>`, and `goal.list --ownerType PERSON --ownerId <dana>` |
| "Platform owns the Q4 migration" | `project.update --id <project> --ownerType TEAM --ownerId <platform>` (set both together; `--ownerType null --ownerId null` clears the owner) |
| "Engineering's H2 goal is 99.9% uptime, and Platform has a sub-goal for it" | `goal.list`, then `goal.create --title "99.9% uptime" --ownerType DEPARTMENT --ownerId <eng> --period 2026-H2 --unit % --baseline 99.5 --target 99.9`, then `goal.create --title "..." --ownerType TEAM --ownerId <platform> --parentId <eng goal>` |
| "Uptime is at 99.7%, and it's at risk" | `goal.checkIn --goalId <goal> --value 99.7 --status AT_RISK --comment "..."` (optional `--date`; the status also becomes the goal's status) |
| "The Q4 migration is part of the uptime goal" | `goal.addProject --goalId <goal> --projectId <project>` |
| "Add the expense policy, version 2, effective 1 October" | `page.list`, then `page.create --title "Expense policy" --kind POLICY --properties '{"status":"ACTIVE","version":"2","effectiveDate":"2026-10-01"}' --content-file policy.md` |
| "We pay Datadog $40k a year; it renews in March" | `page.create --title Datadog --kind SOFTWARE --properties '{"vendor":"Datadog","annualCost":40000,"currency":"USD","renewalDate":"2027-03-01"}'` |
| "Platform uses Datadog for alerting" | `relation.add --fromType TEAM --fromId <platform> --toType PAGE --toId <datadog> --kind USES --note "Alerting"` |

Entity types for notes, docs, todos, reports, links and tags: `PERSON TEAM DEPARTMENT PROJECT GOAL PAGE`. They also accept `DOC NOTE REPORT TODO LINK TAG COMMENT EMOJI`. The full data model is in [references/schema.md](references/schema.md).

## Linking things

- **Owners:** a project or goal's owner is its `ownerType` + `ownerId` (a person, team or department). Set that instead of adding an `OWNS` relation.
- **Relations:** `relation.add --fromType --fromId --toType --toId --kind --note` links any two of `PERSON TEAM DEPARTMENT PROJECT GOAL PAGE DOC NOTE REPORT`. Kinds are `RELATED` (the default), `OWNS`, `USES`, `APPLIES_TO`, `DEPENDS_ON` and `SUPERSEDES`. Write it in the direction it reads: "Platform uses Datadog" is from Platform to Datadog. `relation.forEntity` shows both directions, grouped by label ("Uses", "Used by"). Change a note or kind with `relation.update`.
- **Linking in content:** in a page, doc, note or report, write `[Title](<path>)` using the `path` from a get or create result. Saving the content turns the link into a backlink: the target shows "Mentioned in". Other paths are `/app/people/<id>`, `/app/teams/<id>`, `/app/departments/<id>`, `/app/projects/<id>`, `/app/goals/<id>`, `/app/wiki/<id>` and `/app/reports/<id>`. Links inside code blocks don't count. Don't add `MENTIONS` with `relation.add`; to remove a backlink, remove the link from the content.

## Reports

Reports are markdown, attached to a person, team, department, project, goal or page, with optional charts, and printed with the user's branding.

1. Gather the facts first (`person.get`, `note.list`, `todo.forEntity`, and so on). Don't invent numbers; ask for them if they're missing.
2. Write the markdown. Add charts as fenced `chart` blocks; the syntax is in [references/charts.md](references/charts.md).
3. `wnotes report.create --entityType TEAM --entityId <id> --title "Q3 review" --content-file /tmp/q3.md`, or `report_create` with the markdown as `content`.
4. If a chart is invalid, the error names the line (`chart block at line 12: series.0.values has 2 values but there are 3 labels`). Fix it, then `wnotes report.update --id <report> --content-file /tmp/q3.md`.
5. Tell the user where to view it. Call `app_open` (with the report's `notebook`) so the app is running, then give them `http://127.0.0.1:5173/app/reports/<id>?notebook=<notebook id>`; the `notebook` parameter opens the app in the right notebook. The print/PDF view is `/app/reports/<id>/print?notebook=<notebook id>`.

## Importing a PDF

The app stores PDFs but can't read them; you do the reading.

1. Read the PDF and convert it to clean markdown, keeping headings, lists and tables.
2. `wnotes doc.add --entityType PERSON --entityId <id> --title "<title>"`, then `wnotes doc.update --id <doc> --content-file /tmp/doc.md`
3. To keep the original attached, when you have a shell: `base64 -i file.pdf > /tmp/pdf.b64`, then `wnotes doc.attachSource --docId <doc> --contentType application/pdf --dataBase64-file /tmp/pdf.b64`

## Backups

Snapshots are kept on this computer in the `Backups` folder, per notebook. On macOS every notebook is snapshotted hourly, when something changed, if the user ran `wnotes backup install`.

- A snapshot covers one notebook: `backup_snapshot` with `notebook`, or `wnotes backup --force --reason "<why>" --notebook <id>`. Snapshot the notebook you're about to change.
- `backup_list` (with `notebook`), or `wnotes backup list` for every notebook
- Restore **only when the user asks**, and only from a shell: `wnotes backup restore <id|latest> --notebook <id>`. The app must be closed. Restore snapshots the current data first, so it can be undone. Without a shell, give the user that command to run.
