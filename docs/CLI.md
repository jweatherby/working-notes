# The CLI and the MCP server

`wnotes` calls the application's own API against your local database, and applies the same
validation rules as the web app. **The app does not need to be running.** The MCP server — the
standard way Claude connects to a local program — offers the same operations as tools, so Claude
works the same way through either one.

Each operation is called a procedure, and its name is the domain and the action: `person.create`,
`goal.checkIn`. This page explains the shape of the interface. For the list itself, ask the
program:

```bash
wnotes help                    # every procedure
wnotes help todo.create        # one procedure's inputs, types and limits
```

## Calling a procedure

```bash
wnotes person.create --name "Dana Park" --title "Senior Engineer"
wnotes person.update --id <personId> --leadId <leadPersonId>
wnotes team.addMember --teamId <teamId> --personId <personId>
wnotes note.add --entityType PERSON --entityId <personId> --content "Wants to lead the migration"
wnotes todo.create --title "Book 1:1" --entityType PERSON --entityId <personId> --priority 2
```

- **Results go to standard output as JSON. Logs go to standard error.** You can pipe the output
  straight into `jq`.
- Most calls return `{"ok": true, "value": ...}` or `{"ok": false, "error": {"message": ...}}`.
  The exit status is 1 if the call failed, if the input was invalid, or if the procedure does not
  exist. Each error message says what to fix.
- **Each procedure types its own values.** `--priority 2` becomes a number, `--title 2024` stays a
  string, and `--leadId null` clears the field.
- **Pass long text in a file** with `--<field>-file <path>`, for example `--content-file review.md`.
  To pass a whole input at once, use `--input '{"...": ...}'`.
- **A query needs at least one argument.** If you want them all, pass an optional flag, such as
  `wnotes todo.list --archived exclude`.

## Notebooks

Every call works on one notebook — the default, unless you name another.

```bash
wnotes notebook.list
wnotes notebook.create --name "Garden"
wnotes notebook.setDefault --id garden
wnotes person.list --notebook garden        # anywhere in the arguments
WNOTES_NOTEBOOK=garden wnotes person.list
```

Ids do not carry across notebooks. Look a person, team or project up in the notebook you are
writing to.

There is **no command to delete a notebook**, by design: no single call should be able to remove one.
To retire a notebook, move its folder out of `Notebooks/` yourself.

## What you can create

| Entity | Notes |
|---|---|
| `PERSON` | `leadId` is the manager; one department, many teams |
| `TEAM` | members are many-to-many |
| `DEPARTMENT` | a person is in at most one |
| `PROJECT` | free-text `status`, sub-projects via `parentId`, three-point estimates, an owner |
| `GOAL` | an owner (none = org-wide), `period` like `2026-H2`, `unit`/`baseline`/`target`, sub-goals, check-ins |
| `PAGE` | the wiki: `kind` is `GENERAL`, `POLICY`, `PRODUCT`, `SOFTWARE` or `DECISION`, plus typed `properties` per kind |

Notes, docs, todos, links, tags, comments and emoji attach to any of these through `entityType` +
`entityId` — with one exception: **docs don't attach to a `PAGE`**, because a page's own `content`
is the place for that material.

```bash
wnotes goal.create --title "99.9% uptime" --ownerType DEPARTMENT --ownerId <eng> \
  --period 2026-H2 --unit % --baseline 99.5 --target 99.9
wnotes goal.checkIn --goalId <goalId> --value 99.7 --status AT_RISK --comment "Two brownouts."
wnotes page.create --title Datadog --kind SOFTWARE \
  --properties '{"vendor":"Datadog","annualCost":40000,"currency":"USD","renewalDate":"2027-03-01"}'
```

A check-in needs at least one of `value`, `status` or `comment`. If it carries a status, that
becomes the goal's status too. `goal.get` returns `current` and `progress`, and calculates progress
correctly when a lower number is better, as in 480 ms down to 200 ms.

Page `properties` are typed per kind and unknown keys are rejected, with the allowed list in the
error. `POLICY` takes `status`/`version`/`effectiveDate`/`reviewDate`; `PRODUCT` `status`/`url`;
`SOFTWARE` `vendor`/`url`/`annualCost`/`currency`/`renewalDate`/`seats`; `DECISION`
`status`/`decidedOn`.

## Linking things

**Owners.** A project or goal's owner is `ownerType` + `ownerId`, set together. There is no
ownership relation.

```bash
wnotes project.update --id <project> --ownerType TEAM --ownerId <team>
wnotes goal.addProject --goalId <goal> --projectId <project>
```

**Relations.** `relation.add` links any two entities, with only two kinds on purpose:

```bash
wnotes relation.add --fromType TEAM --fromId <platform> --toType PAGE --toId <datadog> \
  --note "Uses it for alerting"
wnotes relation.add --fromType PROJECT --fromId <checkout> --toType PROJECT --toId <api> \
  --kind DEPENDS_ON
```

`RELATED` (the default) has no direction, so linking B to A when A is already related to B is a
duplicate. `DEPENDS_ON` reads from `from` to `to`: Checkout depends on the API, and the API shows it
as "Needed by". For anything else — uses, replaces, applies to — use `RELATED` and say how in
`--note`. `relation.forEntity` shows both directions, grouped by label.

**Backlinks are automatic.** Write a markdown link to an app path in a page, doc, note or report,
and saving the content creates a `MENTIONS` relation — the target then shows "Mentioned in".

```markdown
Platform spent the quarter on the [Q4 migration](/app/projects/<id>).
```

Paths are `/app/people/<id>`, `/app/teams/<id>`, `/app/departments/<id>`, `/app/projects/<id>`,
`/app/goals/<id>` and `/app/wiki/<id>`. Links inside code blocks don't count, and matching is by id,
not title, so renaming a thing never breaks a backlink. `relation.add` refuses `MENTIONS`: remove a
backlink by removing the link.

## Archiving and deleting

Archiving keeps history; deleting doesn't.

```bash
wnotes project.archive --id <project>
wnotes project.list --archived only        # also include, or the default exclude
```

An archived entity disappears from every `list`, from the org map, from the home feed and from the
todo list. `get` still returns it. Any write to it — **or to anything attached to it** — fails with
an error telling you to unarchive it first.

Archiving is not a status. `project.status` is free text and separate from it.

Deleting cascades to the entity's docs, notes, todos, links, tags, comments, emoji and relations at
either end, and clears any goal or project owner pointing at it.

## Charts in docs and notes

A chart is a fenced block with the language `chart`, containing JSON. It renders wherever markdown
renders, in the notebook's branding colours.

````markdown
```chart
{
  "type": "bar",
  "title": "Story points",
  "labels": ["Jul", "Aug", "Sep"],
  "series": [
    { "label": "Committed", "values": [30, 32, 28] },
    { "label": "Delivered", "values": [24, 33, 29] }
  ],
  "min": 0
}
```
````

| Key | Required | Rules |
|---|---|---|
| `type` | yes | `bar`, `line` or `radar` |
| `labels` | yes | 1–100 strings: the x-axis categories, or the radar spokes |
| `series` | yes | 1–6 objects `{ "label"?: string, "values": number[] }`, **one number per label** |
| `title` | no | shown above the chart |
| `min`, `max` | no | axis range, e.g. `"min": 0, "max": 5` for a 1–5 scale |

No other keys are allowed; colours come from the notebook's branding. Every value must be a plain
number — not `"12%"`, not `null`, and never blank.

Use **bar** to compare categories, **line** for a trend over time, and **radar** for a profile
across three to eight dimensions on one scale.

Working Notes validates chart blocks when it saves a **wiki page** or a report. If a chart is wrong,
it rejects the whole save and names the line of the opening fence:

| Error | Fix |
|---|---|
| `series.0.values has 2 values but there are 3 labels` | add the missing value, or remove the label |
| `invalid JSON (...)` | usually a trailing comma, single quotes or an unquoted key |
| `chart Unrecognized key(s) in object: 'colors'` | remove the key |
| `series Array must contain at most 6 element(s)` | split into two charts |

Docs and notes render charts but do not validate them: a malformed block is left undrawn instead of
blocking the save. Check a chart by viewing the doc.

Mermaid diagrams render too, in ```` ```mermaid ```` blocks.

## Images in docs

Upload the image, then put its key in the doc's markdown as a `storage://` link:

```bash
base64 -i chart.png > /tmp/img.b64
wnotes doc.uploadImage --docId <doc> --contentType image/png --dataBase64-file /tmp/img.b64
# → { "ok": true, "value": { "key": "docs/<doc>/image-<uuid>.png" } }
```

```markdown
![Latency after the read replicas](storage://docs/<doc>/image-<uuid>.png)
```

PNG, JPEG, GIF and WebP, up to about 10 MB. In the app, pasting or dropping an image into the
editor does the same.

Reports — branded markdown with charts, printable to PDF — are built but turned off while they are
unfinished. The flag is `features.reports`. Write finished write-ups as docs instead.

## Importing a PDF

The CLI stores PDFs but doesn't read them. Read it yourself, then:

```bash
wnotes doc.add --entityType PERSON --entityId <id> --title "Career plan"
wnotes doc.update --id <doc> --content-file /tmp/doc.md
base64 -i file.pdf > /tmp/pdf.b64
wnotes doc.attachSource --docId <doc> --contentType application/pdf --dataBase64-file /tmp/pdf.b64
```

In the web app, "Convert with Claude" on a doc does the same by running your own `claude` CLI with
only the Read tool. Without `claude` installed it returns a warning and the PDF just stays attached.

## Backups

```bash
wnotes backup --force --reason "before the reorg"   # snapshot now, regardless
wnotes backup list                                  # snapshots with counts, per notebook
wnotes backup install                               # hourly LaunchAgent (macOS)
wnotes backup restore latest --notebook <id>        # app must be closed
```

A snapshot is a consistent `VACUUM INTO` copy of the database plus the notebook's files, with
unchanged files hard-linked from the previous snapshot. Restore checks the snapshot's integrity and
snapshots the current data first, so it can be undone. Retention: everything from the last 48h, then
daily for 30 days, weekly for 26 weeks, and always the 3 newest.

Add `--notebook <id>` to `run`, `list` or `restore` to work on one notebook.

## The MCP server

```bash
wnotes mcp
```

This runs a server that talks over standard input and output. It opens no port and uses no network.
It offers every procedure as a tool, with `.` written as `_`, so `person.create` becomes
`person_create`. Queries are marked read-only, and the `delete`, `remove` and `detach` tools are
marked destructive. Every tool except `notebook_*` accepts an optional `notebook` argument.

On top of the procedures it adds `backup_snapshot`, `backup_list`, `app_open` (starts the app and
returns its link) and `app_restart`.

The plugin starts this for you. Point another MCP client at `wnotes mcp` to use it directly.
