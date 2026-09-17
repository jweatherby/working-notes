# Working Notes

Working Notes remembers what you would otherwise carry in your head: who reports to whom, which team
owns which project, where a goal stands this month, why you chose that vendor, what you promised to
follow up on.

You put things in by telling Claude. You read them in an app on your own Mac.

![The home dashboard: open todos, a feed of recent changes, and a graph of how everything links up](docs/images/home.png)

## What you can use it for

- **Running a team.** Who reports to whom, who sits on which team, what you agreed in the last 1:1,
  who is ready for more.
- **Keeping track of the work.** Projects, who owns them, what blocks what, and what you said you
  would do next.
- **Goals with real numbers.** A target, a figure each month, and a chart of how it actually went.
- **Remembering decisions.** Why you bought that tool, what it costs, when it renews, which policy
  applies.
- **Writing it up.** A quarter in review, a career plan, a summary for your boss — built from what
  is already there.

## How it works

**You talk, Claude files.** Say "Dana moved from Platform to Payments" and Claude makes the change.
There is no form to fill in, and the app does not need to be open.

**It keeps the shape of things.** A person has a manager. A project has an owner. A goal has
check-ins with dates and values. That is what lets you ask "what do I know about Dana?" or "what
depends on the payments API?" and get an answer instead of a search result.

**Nothing leaves your Mac.** No accounts, no keys, no sync, nothing sent anywhere. The app itself
never calls a language model — Claude works on it from outside.

**Work and side projects stay apart.** Each notebook is separate, and nothing links across them.

## What using it looks like

### An org change

> **You:** Dana Park joined as a senior engineer, on Platform, reporting to Alice.

Claude adds Dana, sets the reporting line, and puts her on the team.

![The org map: reporting lines with team chips, and buttons to add a person, team or department](docs/images/org-map.png)

You can edit the org map by hand as well. Redrawing a reorganisation is the one job that is quicker
that way.

### After a 1:1

> **You:** Note that Dana wants to lead the migration — she'd change the on-call rotation first.
> Remind me to book a 1:1.

The note goes on Dana's page in your words, with the date. The reminder becomes a todo.

![Dana's page: lead, department and team, an open todo in the sidebar, notes in the right panel](docs/images/person.png)

Ask "what do I know about Dana?" months later and Claude reads back her notes, todos, docs and
goals.

### A goal you check in on

> **You:** Platform's H2 goal is p95 latency under 200ms, from 480. We're at 310 now — read replicas
> took another 80ms off.

Each check-in adds to a timeline instead of overwriting a number, so the chart is the history.

![The goal page: a progress bar, a line chart of check-ins against the target, and the check-in history](docs/images/goal.png)

### A wiki that links up

> **You:** We pay Datadog $40k a year for 40 seats; it renews in March. Platform uses it for
> alerting.

Pages come in kinds. A software page takes a vendor, a cost and a renewal date; a policy page takes
a version and an effective date. Working Notes turns away anything else, so pages of the same kind
stay comparable.

![The Datadog page: vendor fields, notes, and a sidebar showing what relates to it and what mentions it](docs/images/wiki-page.png)

Anything can link to anything — related, or one depends on the other. Mention a project inside a
page and the project gains a "Mentioned in" entry by itself.

### Writing it up

> **You:** Write up Platform's quarter as a doc — delivery and reliability, with charts.

Docs are markdown, and a doc can hold charts drawn from figures you give Claude.

![A doc on the Platform team: prose and a bar chart of committed against delivered story points](docs/images/doc-charts.png)

## The app

The app is mostly for reading, usually in a browser pane beside Claude. You can install it on your
Mac so that it gets a Dock icon and a window of its own — see
[docs/INSTALL.md](docs/INSTALL.md#install-it-as-a-mac-app).

The home screen shows your open todos, what changed lately, and a graph of how things connect. The
org map shows reporting lines. Everything else gets a page of its own, with its docs, todos and
links in the sidebar and its notes on the right.

Press ⌘K to search. Start with `/` to look in one place only, as in `/person dana`.

Every page has a **Chat** tab for asking about what is on screen. It runs your own copy of Claude
and saves nothing.

Nothing is lost by accident. Archiving keeps a thing and its history but takes it out of every list.
Deleting takes its notes and todos with it, so Claude offers to archive first.

## Backups

Working Notes copies each notebook every hour, but only when something changed. Restoring saves your
current data first, so you can undo it.

```bash
wnotes backup install
```

Copies stay on this disk, so they will not save you from losing the disk. Time Machine will, and it
covers them for you.

## Getting started

- **[docs/INSTALL.md](docs/INSTALL.md)** — install it for Claude Code, Cowork or the Claude desktop
  app. A release brings the app with it, so there is nothing else to install.
- **[docs/CLI.md](docs/CLI.md)** — the `wnotes` command and the tools Claude uses, for when you want
  to drive it yourself.
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** — running from a clone, and how releases work.

## Status

Working Notes is one person's tool, built in the open. Expect it to change.

Reports — branded write-ups printed to PDF — are built but switched off while they are unfinished.
Write-ups go in docs instead.

Releases are built for Apple silicon Macs. Everything but the hourly backup runs on Linux too.
