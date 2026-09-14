# Backend Conventions — `src/api/`

## Domains

Each domain is flat until it hurts:

```
src/api/{domain}/
├── routes.ts         # tRPC router: Zod input validation, calls operations
├── operations.ts     # Business logic + Prisma queries
└── tests/            # Unit tests with a mocked registry, only for logic worth testing
```

Split into sub-domain folders with the same shape once an operations file passes ~300 lines or clearly holds unrelated noun-clusters.

Current domains, grouped into folders:

- `org/`: `person`, `team`, `department`
- `aux/` (attach to any entity via `entityType` + `entityId`): `doc`, `note`, `todo`, `link`, `tag`, `comment`, `emoji`, `report`
- flat (infra + top-level entities): `project`, `goal`, `page` (wiki pages), `relation`, `branding`, `home`, `health`, `trpc-meta`
- `notebook`: lists, creates and renames notebooks and sets the default. It works on the notebook store (`ctx.notebooks`), not on a database. See § Notebooks.

Loose backend helpers that aren't domains use an underscore prefix:

- `_entity-labels.ts`: entity reference → display name. Also the existence check for owners, relations and mentions.
- `_owners.ts`: `resolveOwnerInput` validates a goal or project owner (`ownerType` + `ownerId`, set together or both null); `loadOwner` returns its name and path.
- `_entity-cleanup.ts`: `planEntityCleanup`, `relationCleanupOp` and `removeFiles`, for deletes (see § Deletes).

## The Registry

Every operation receives its dependencies as the first parameter, declared with `Pick`:

```ts
// src/shared/registry.ts
export interface Registry {
  readonly prisma: PrismaClient;   // SQLite via @prisma/adapter-libsql
  readonly now: () => Date;
  readonly uuid: () => string;
  readonly logger: Logger;
  readonly storage: StorageClient; // local disk under the notebook's files/ folder
}
```

```ts
export const updateNote = async (
  reg: Pick<Registry, 'prisma'>,
  id: string,
  input: { readonly content: string }
): Promise<Result<{ readonly id: string }>> => {
  const existing = await reg.prisma.note.findUnique({ where: { id } });
  if (!existing) return err(new Error('Note not found'));
  await reg.prisma.note.update({ where: { id }, data: { content: input.content } });
  return ok({ id });
};
```

- `reg` is always the first parameter. Use `Pick<Registry, ...>`, never bare `Registry`.
- Never call `new Date()`, `crypto.randomUUID()` or `console.log` in an operation. Use `reg.now()`, `reg.uuid()`, `reg.logger`.
- `new PrismaClient()` appears only in `src/shared/registry.server.ts`, which keeps one Registry per notebook: `getRegistry(notebookId)`. Outside tRPC (a load function, a script), use `getReadyRegistry(notebookId)` from `$shared/db/bootstrap.server`, which migrates that notebook first. Tests build registries with `createTestRegistry()` from `src/shared/registry.test.ts`.
- Operations never know which notebook they're in. The Registry they're given already points at one.
- There is no LLM on the registry, and there must not be one. Claude does that work from outside.

## Result

Operations that can fail return `Result<T>`: `ok(value)` or `err(new Error(message))`. The message travels to the UI and the CLI as JSON (`err()` makes it serializable), so write messages a reader can act on. "chart block at line 12: series.0.values has 2 values but there are 3 labels" beats "Invalid input".

## tRPC

- `src/shared/trpc/init.ts` exports `router`, `procedure`, `middleware`. There is one kind of procedure: no auth, no org scoping.
- Context is `{ reg, notebook, notebooks }` (`context.server.ts`): the Registry of the notebook the call runs against, that notebook, and the notebook store. Over HTTP the notebook comes from `event.locals.notebook`; the CLI and MCP server build the context with `createNotebookContext(notebook)`. Domain routes pass only `ctx.reg`.
- Validate inputs with Zod inline in `routes.ts`. Use `z.enum(ENTITY_TYPES)` / `z.enum(TODO_STATUSES)` from `$shared/types/enums`. SQLite has no enums, so these unions are the source of truth.
- Register new routers in `src/shared/trpc/router.ts`. The CLI (`wnotes`) and its MCP server (`wnotes mcp`) call every procedure in-process through `cli/api.ts` and `createCallerFactory`, and build their help and tool lists from `src/shared/trpc/meta.ts`, so new procedures need no CLI or MCP changes.

## Polymorphic assets

Docs, notes, reports, todos, links, comments, emoji and tag attachments hang off any entity through `entityType` + `entityId`. The exception is docs on a wiki page: `addDoc` refuses a type that fails `acceptsDocs` (`$shared/utils/entity`), and `EntityDetailPage` hides the docs list for it. Prisma returns `entityType` as `string`; cast to `EntityType` when mapping to typed results. `entityPath()` (`$shared/utils/entity`) gives the app route; `resolveEntityLabel()` (`$api/_entity-labels`) gives the display name.

Goal and project owners (`ownerType` + `ownerId`) and both ends of a relation are polymorphic in the same way, with no foreign key.

## Deletes

Nothing polymorphic has a foreign key, so a delete cleans up after itself. Every delete of a person, team, department, project, goal, page or report calls `planEntityCleanup(reg, type, id)` and runs its `ops` in the same `$transaction` as the delete:

- delete the docs, notes, reports, todos, links, tag attachments, comments and emoji attached to the entity
- delete relations at either end
- clear goal and project owners that point at it

Then call `removeFiles(reg, cleanup.files)` for the attached docs' PDFs once the transaction commits. Doc and note removal use `relationCleanupOp` alone. Goals and pages move their children up to their own parent; `wouldCreateCycle` (`$shared/utils/hierarchy`) rejects a parent change that would make a loop for projects, goals and pages.

## Archiving

Person, team, department, project, goal and page (`ARCHIVABLE_TYPES`) have a nullable `archivedAt`. The helpers are in `_archive.ts`:

- `setArchived(reg, type, id, archived)` backs every `<type>.archive` / `<type>.unarchive` procedure. It's idempotent and keeps the first archive date.
- `archiveWhere(filter)` is the `where` fragment for a list's `archived` input (`exclude`, the default; `only`; `include`). Every top-level `list*` takes one.
- `ensureWritable(reg, entityType, entityId)` / `ensureAllWritable` refuse a write to an archived entity **or to anything attached to it**. Call one in every update, membership change and aux create/update/remove, before writing. Types that can't be archived pass. Deletes don't check: deleting an archived entity is allowed.
- `loadArchivedIds` + `notAttachedToArchived(ids)` leave rows attached to archived entities out of cross-entity queries (home feed, open todos, `todo.list`).
- Relations check only the `from` end, so a relation can point at an archived entity.

Archiving is not a status. `Project.status` is free text and separate; don't derive one from the other.

## Relations and mentions

A `Relation` is a link (`fromType`/`fromId` → `toType`/`toId`) with a `kind` and an optional `note`, unique per pair and kind. The kinds are `RELATED`, which has no direction (so `findDuplicate` in `relation/operations.ts` also checks the reverse pair), `DEPENDS_ON`, and the derived `MENTIONS`. Keep the list short: a new kind needs a real reason, and anything else is `RELATED` with a note. `RELATION_LABELS` (`$shared/types/relations`) gives the forward and inverse label for each kind, and `relation.forEntity` groups by the label from the asking entity's side ("Depends on", "Needed by").

- `MENTIONS` relations are derived. `syncMentions` (`relation/mentions.ts`) runs whenever page, doc, note or report content is saved. It reads app links with `extractEntityLinks` (`$shared/utils/mentions`, which skips code blocks and uses `parseEntityPath`), keeps the ones whose entity exists, and replaces that source's `MENTIONS` rows. Nothing matches by title, so a rename needs no rescan.
- `relation.add`, `update` and `remove` refuse `MENTIONS`; only the sync writes them.
- Any new content save must call `syncMentions` after it writes.

## Notebooks

A notebook is a folder, `<data dir>/Notebooks/<id>/`, holding `notebook.json` (name, createdAt), `working-notes.db` and `files/`. The default notebook is in `<data dir>/settings.json`. The code lives in `src/shared/notebooks/`:

- `id.ts`: `isNotebookId` (1–40 lowercase letters, digits and dashes) and `notebookIdFromName`. Client-safe.
- `resolve.ts`: `resolveNotebook`, pure. Named on the call (id, or a name matching exactly one notebook), then `WNOTES_NOTEBOOK`, then the UI cookie, then the default. An unknown named notebook is an error listing the ones that exist.
- `layout.ts` / `layout.server.ts`: `planLayout` (pure) and `ensureLayout`, which moves a pre-notebooks data directory into `work-work` and makes sure a default exists.
- `store.server.ts`: `NotebookStore`, the raw filesystem reads and writes. `$api/notebook/operations` does the validation and writes the messages.
- `current.server.ts`: `getNotebookStore`, `readNotebooks` and `resolveCurrentNotebook`. Every entry point resolves through these, so the layout is always in place first.
- `handle.server.ts`: `notebookHandle`, which sets `event.locals.notebook` for each request.

There is no `notebook.delete`, on purpose: Claude should never be one tool call away from removing a whole notebook.

## Files

`reg.storage` stores bytes under the notebook's `files/<key>` (`~/Library/Application Support/Working Notes/Notebooks/<id>/files`). Keys don't include the notebook, and the files route reads from the request's notebook. Keys look like `docs/<docId>/source-<uuid>.pdf` or `branding/<id>/logo-<uuid>.png`. The storage client rejects keys that resolve outside the files root. Hand clients a URL with `fileUrl(key)` (`$shared/utils/files`), which is served by `src/routes/files/[...key]/+server.ts`.

- **Docs:** `attachSourcePdf` stores the PDF and sets `sourceUrl`; it never converts. Claude reads the PDF and calls `doc.update`.
- **Branding:** images upload as base64 through `branding.uploadImage`, which returns a storage key. `branding.update` saves the key and deletes any file it replaces.

## Reports

A `Report` is markdown attached to an entity, with an optional `brandingId`. `getReport` resolves branding as: the report's own, else the default profile, else none. The print view is `/app/reports/<id>/print`.

`createReport`, `updateReport`, `createPage` and `updatePage` run `validateChartBlocks` (`$shared/types/charts`) and reject the write if any chart block is invalid. Chart blocks are fenced `chart` code blocks containing JSON:

````markdown
```chart
{
  "type": "bar",
  "title": "Velocity",
  "labels": ["Sprint 1", "Sprint 2", "Sprint 3"],
  "series": [
    { "label": "Committed", "values": [30, 32, 28] },
    { "label": "Delivered", "values": [21, 34, 29] }
  ],
  "min": 0
}
```
````

- `type`: `bar` | `line` | `radar`
- `labels`: 1–100 strings
- `series`: 1–6 series, each with exactly one number per label, and an optional `label`
- Optional: `title`, `min`, `max`. No other keys are allowed.
- Charts render in brand colours in the editor, in doc/note views and in the print view.
- Legacy `[chart:key]` tags (`avg_by_section`, `scores:<section>`, `radar:<section>`) render survey sections and are reserved for results imported from form-engine.

## Adding a domain

1. `prisma/schema.prisma` model + `bun run db:migrate --name <change>`
2. `src/api/{domain}/operations.ts` — operations take `reg: Pick<Registry, ...>` first and return `Result`
3. `src/api/{domain}/routes.ts` — Zod inputs, call operations with `ctx.reg`
4. Register the router in `src/shared/trpc/router.ts`
5. Shared interfaces in `src/shared/types/{name}.ts`, components in `src/lib/{domain}/components/`, stores in `src/lib/stores/`
6. Tests: unit tests only for real logic; add to the integration smoke tests if it's a core flow
7. If it's a new entity type:
   - add it to `ENTITY_TYPES` (and `RELATABLE_TYPES` if relations can point at it)
   - add it to `ROUTE_SEGMENTS` and `TYPE_LABELS` in `src/shared/utils/entity.ts`, which drive `entityPath()`, `parseEntityPath()` and `entityTypeLabel()`
   - add a case to `resolveEntityLabel()`
   - call `planEntityCleanup` in its delete
   - add a list + detail page using `EntityDetailPage`, and add it to the `AppShell` nav
