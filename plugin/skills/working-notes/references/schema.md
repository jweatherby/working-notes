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

**Project**: `name`, `description?`, `status?` (free text, e.g. `planning`, `active`, `done`), `startDate?`, `endDate?`, `parentId?` (sub-projects), and three-point estimates `daysOptimistic?`, `daysLikely?`, `daysPessimistic?`.

## Things attached to any entity

These use `entityType` + `entityId`, where `entityType` is `PERSON`, `TEAM`, `DEPARTMENT` or `PROJECT` (also `DOC`, `NOTE`, `REPORT`, `TODO`, `LINK`, `TAG`, `COMMENT`, `EMOJI`).

| Entity | Fields | Procedures |
|---|---|---|
| **Note** | `content` (markdown), `parentId?` for a reply | `note.list`, `note.add`, `note.update`, `note.remove` |
| **Doc** | `title`, `content` (markdown), `sortOrder`, `sourceUrl?` (attached PDF) | `doc.list`, `doc.add`, `doc.update`, `doc.reorder`, `doc.attachSource`, `doc.getReadUrl`, `doc.remove` |
| **Todo** | `title`, `description?`, `status`, `priority` 0–3 (3 is highest), `targetDate?`, `completedAt` (set automatically) | `todo.list` (filter `--status`, `--entityType`), `todo.forEntity`, `todo.create`, `todo.update`, `todo.delete` |
| **Report** | `title`, `content` (markdown with chart blocks), `brandingId?` | `report.list`, `report.forEntity`, `report.get`, `report.create`, `report.update`, `report.remove` |
| **Link** | `url`, `title?` | `link.list`, `link.add`, `link.remove` |
| **Tag** | `name` (unique), `color` | `tag.list`, `tag.create`, `tag.delete`; `tag.forEntity`, `tag.attach`, `tag.detach` |
| **Comment** | `content` | `comment.list`, `comment.add`, `comment.remove` |

Todo `status` is one of `PENDING ACTIVE COMPLETE CANCELLED`. `todo.list` returns each todo's `entityLabel` (the person/team/project name) and `entityPath`.

Docs are for longer reference material (a career plan, an imported PDF). Notes are short, dated observations. Reports are finished write-ups meant to be printed.

## Branding

**Branding**: `name`, colours (`primaryColor`, `accentColor`, `primaryFontColor`, `accentFontColor`, as `#rrggbb`), an optional logo and icon, and `isDefault`. A report with no `brandingId` uses the default branding. Brandings are managed in the UI; you rarely need to touch them.

## Dates

Pass ISO dates (`2026-10-01` or `2026-10-01T09:00:00Z`). Results come back as ISO strings.
