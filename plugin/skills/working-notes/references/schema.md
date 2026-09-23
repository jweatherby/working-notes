# Working Notes data model

Everything belongs to one user; there are no accounts, orgs or permissions. Ids are opaque strings. Always look them up; never guess.

## Org chart

| Entity | Fields | Relationships |
|---|---|---|
| **Person** | `name`, `email?`, `title?` | `leadId` → Person (their manager; reports are the inverse). `departmentId` → one Department. Many Teams through membership. |
| **Team** | `name`, `description?` | Members are People (many-to-many): `team.addMember` / `team.removeMember` / `team.listMembers` |
| **Department** | `name`, `description?` | Members are People (each person has at most one): `department.addMember` sets it, `department.removeMember` clears it |

- `person.get` returns `leadName`, `reports`, `teamMemberships` and `department`.
- Deleting a person clears their reports' `leadId` and their department link, and removes their team memberships.

## Projects

**Project**: `name`, `description?`, `status?` (free text, e.g. `planning`, `active`, `done`), `startDate?`, `endDate?`, `parentId?` (sub-projects), an owner (`ownerType` `PERSON`, `TEAM` or `DEPARTMENT` + `ownerId`), and three-point estimates `daysOptimistic?`, `daysLikely?`, `daysPessimistic?`.

- Set `ownerType` and `ownerId` together. Set both to `null` to clear the owner. The owner must exist.
- `project.list` filters by `ownerType` + `ownerId`. `project.get` returns the `owner` with its name and path. `project.create` returns `{ id, path }`.
- A parent that would make a loop (a project under its own sub-project) is rejected.

## Goals

**Goal**: `title`, `description?`, an owner (`ownerType` `PERSON`, `TEAM` or `DEPARTMENT` + `ownerId`; no owner means org-wide), `parentId?` (the cascade, e.g. a team goal under a department goal), `period?`, `status`, and an optional metric: `unit?`, `baseline?`, `target?`.

- `period` is `2026`, `2026-H2` or `2026-Q3`.
- `status` is one of `NOT_STARTED ON_TRACK AT_RISK OFF_TRACK DONE DROPPED` (default `NOT_STARTED`).
- `goal.list` filters by `ownerType` + `ownerId`, `period`, `status`, `parentId` (`null` for top-level goals) and `projectId`.
- `goal.get` returns the owner, parent, sub-goals, check-ins (newest first), linked projects, `current`, `progress` and `path`. `goal.create` returns `{ id, path }`.
- `current` is the value of the latest check-in that has one. `progress` is 0–1 from `baseline` (0 if unset) to `target`, and `null` until there is a target and a current value. It works for goals where lower is better.
- Owner rules are the same as for projects. A parent that would make a loop is rejected.
- Deleting a goal moves its sub-goals up to its parent, and deletes its check-ins and project links.

**Check-in**: `date` (defaults to now), `value?`, `status?`, `comment?`. It needs at least one of value, status or comment. A status on a check-in also becomes the goal's status. Procedures: `goal.checkIn --goalId`, `goal.removeCheckIn --id`.

**Projects**: a goal links to many projects, and a project to many goals: `goal.addProject` / `goal.removeProject` with `--goalId` and `--projectId`.

## Wiki pages

**Page**: `title`, `kind` (default `GENERAL`), `parentId?` (the page tree), `content` (markdown), and `properties` (a JSON object whose keys depend on the kind). Procedures: `page.list` (filters `kind`, `parentId`), `page.get`, `page.create` (returns `{ id, path }`), `page.update`, `page.delete`.

| Kind | Properties |
|---|---|
| `GENERAL` | none |
| `POLICY` | `status` (`DRAFT ACTIVE RETIRED`), `version`, `effectiveDate`, `reviewDate` |
| `PRODUCT` | `status` (`IDEA BUILDING LIVE SUNSET`), `url` |
| `SOFTWARE` | `vendor`, `url`, `annualCost`, `currency`, `renewalDate`, `seats` |
| `DECISION` | `status` (`PROPOSED ACCEPTED SUPERSEDED REJECTED`), `decidedOn` |

- Every property is optional. Dates are `YYYY-MM-DD`, `annualCost` and `seats` are numbers of 0 or more, and `url` is a full URL. Other keys are rejected, and the error lists the allowed ones.
- `page.update` merges `properties` into the current values: keys you pass are set, `null` removes a key, and the rest stay. Changing `kind` drops keys the new kind doesn't have.
- Chart blocks in page content are validated like reports.
- Deleting a page moves its sub-pages up to its parent. A parent that would make a loop is rejected.

## Relations

A relation links two entities, with a `kind` and an optional `note` (up to 1000 characters). Either end is `PERSON`, `TEAM`, `DEPARTMENT`, `PROJECT`, `GOAL`, `PAGE`, `DOC`, `NOTE`, `REPORT` or `TODO`. Procedures: `relation.add` (`fromType`, `fromId`, `toType`, `toId`, `kind`, `note`), `relation.update` (`id`, `kind?`, `note?`), `relation.remove`, `relation.forEntity` (`entityType`, `entityId`).

| Kind | From the `from` side | From the `to` side |
|---|---|---|
| `RELATED` (default, no direction) | Related to | Related to |
| `DEPENDS_ON` | Depends on | Needed by |
| `MENTIONS` (derived) | Mentions | Mentioned in |

- Only one relation of each kind can exist between the same two entities (for `RELATED`, in either direction), and an entity can't relate to itself.
- For a link that's neither ("uses", "replaces"), use `RELATED` with a `note`.
- `relation.forEntity` returns both directions, grouped by the label from that entity's side, and each item has the other entity's name and `path`.
- **`MENTIONS` is derived.** When a page, doc, note or report's content is saved, each markdown link to an app path (`/app/wiki/<id>`, relative or on `http://127.0.0.1:5173`) becomes a `MENTIONS` relation from that page, doc, note or report to the target. Paths are `/app/people/`, `/app/teams/`, `/app/departments/`, `/app/projects/`, `/app/goals/`, `/app/wiki/` and `/app/reports/`, each followed by the id. Links in code blocks and links to ids that don't exist are ignored. `relation.add`, `update` and `remove` refuse `MENTIONS`.

## Things attached to any entity

These use `entityType` + `entityId`, where `entityType` is `PERSON`, `TEAM`, `DEPARTMENT`, `PROJECT`, `GOAL` or `PAGE` (also `DOC`, `NOTE`, `REPORT`, `TODO`, `LINK`, `TAG`, `COMMENT`, `EMOJI`).

Deleting a person, team, department, project, goal, page or report also deletes everything attached to it and its relations, and clears any goal or project owner that pointed at it. Removing a doc, note or todo deletes its relations.

| Entity | Fields | Procedures |
|---|---|---|
| **Note** | `content` (markdown), `parentId?` for a reply | `note.list`, `note.add`, `note.update`, `note.remove` |
| **Doc** | `title`, `content` (markdown), `sortOrder`, `sourceUrl?` (attached PDF) | `doc.list`, `doc.get`, `doc.add`, `doc.update`, `doc.reorder`, `doc.attachSource`, `doc.getReadUrl`, `doc.remove` |
| **Todo** | `title`, `description?`, `status`, `priority` 0–3 (3 is highest), `targetDate?`, `completedAt` (set automatically) | `todo.list` (filter `--status`, `--entityType`), `todo.forEntity`, `todo.create`, `todo.update`, `todo.delete` |
| **Link** | `url`, `title?` | `link.list`, `link.add`, `link.remove` |
| **Tag** | `name` (unique), `color` | `tag.list`, `tag.create`, `tag.delete`; `tag.forEntity`, `tag.attach`, `tag.detach` |
| **Comment** | `content` | `comment.list`, `comment.add`, `comment.remove` |

Todo `status` is one of `PENDING ACTIVE COMPLETE CANCELLED`. `todo.list` returns each todo's `entityLabel` (the person/team/project name) and `entityPath`.

Docs are for longer reference material (a career plan, an imported PDF). They attach to anything except a wiki page: `doc.add` on a `PAGE` fails, because the page's own `content` is the place for that material. Notes are short, dated observations. Reports are switched off for now, so write finished write-ups as docs.

## Branding

**Branding**: `name`, colours (`primaryColor`, `accentColor`, `primaryFontColor`, `accentFontColor`, as `#rrggbb`), an optional logo and icon, and `isDefault`. A report with no `brandingId` uses the default branding. Brandings are managed in the UI; you rarely need to touch them.

## Dates

Pass ISO dates (`2026-10-01` or `2026-10-01T09:00:00Z`). Results come back as ISO strings.

## Archiving

People, teams, departments, projects, goals and pages can be archived: `<type>.archive --id` and `<type>.unarchive --id` (for example `person.archive`, `project.unarchive`). Archiving sets `archivedAt`; archiving twice keeps the first date.

- **Hidden:** `person.list`, `team.list`, `department.list`, `project.list`, `goal.list` and `page.list` leave archived entities out. Pass `--archived only` for just the archived ones, or `--archived include` for both. The org map, the home feed, the project graph and `todo.list` leave out archived entities and what's attached to them.
- **Still readable:** `get` returns an archived entity with its `archivedAt`, and its docs, notes, todos, reports and relations stay as they were.
- **Read-only:** updates, membership changes, check-ins, goal–project links, and adding, editing or removing docs, notes, todos, reports, links, tags, comments and emoji on an archived entity fail, and the error says to unarchive it first. A relation can point *to* an archived entity (a project that supersedes an archived one) but not start from one.
- **Delete still works** on an archived entity, and removes everything attached to it, as for any delete.

