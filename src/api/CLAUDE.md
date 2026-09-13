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
- flat (infra + top-level entities): `project`, `branding`, `home`, `health`, `trpc-meta`

Loose backend helpers that aren't domains use an underscore prefix, e.g. `_entity-labels.ts` (entity reference → display name).

## The Registry

Every operation receives its dependencies as the first parameter, declared with `Pick`:

```ts
// src/shared/registry.ts
export interface Registry {
  readonly prisma: PrismaClient;   // SQLite via @prisma/adapter-libsql
  readonly now: () => Date;
  readonly uuid: () => string;
  readonly logger: Logger;
  readonly storage: StorageClient; // local disk under settings.dataDir/files
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
- `new PrismaClient()` appears only in `src/shared/registry.server.ts`. Tests build registries with `createTestRegistry()` from `src/shared/registry.test.ts`.
- There is no LLM on the registry, and there must not be one. Claude does that work from outside.

## Result

Operations that can fail return `Result<T>`: `ok(value)` or `err(new Error(message))`. The message travels to the UI and the CLI as JSON (`err()` makes it serializable), so write messages a reader can act on. "chart block at line 12: series.0.values has 2 values but there are 3 labels" beats "Invalid input".

## tRPC

- `src/shared/trpc/init.ts` exports `router`, `procedure`, `middleware`. There is one kind of procedure: no auth, no org scoping.
- Context is `{ reg }` (`context.server.ts`).
- Validate inputs with Zod inline in `routes.ts`. Use `z.enum(ENTITY_TYPES)` / `z.enum(TODO_STATUSES)` from `$shared/types/enums`. SQLite has no enums, so these unions are the source of truth.
- Register new routers in `src/shared/trpc/router.ts`. The CLI (`wnotes`) and its MCP server (`wnotes mcp`) call every procedure in-process through `cli/api.ts` and `createCallerFactory`, and build their help and tool lists from `src/shared/trpc/meta.ts`, so new procedures need no CLI or MCP changes.

## Polymorphic assets

Docs, notes, reports, todos, links, comments, emoji and tag attachments hang off any entity through `entityType` + `entityId`. Prisma returns `entityType` as `string`; cast to `EntityType` when mapping to typed results. `entityPath()` (`$shared/utils/entity`) gives the app route; `resolveEntityLabel()` (`$api/_entity-labels`) gives the display name.

## Files

`reg.storage` stores bytes under `<data dir>/files/<key>` (`~/Library/Application Support/Working Notes/files`). Keys look like `docs/<docId>/source-<uuid>.pdf` or `branding/<id>/logo-<uuid>.png`. The storage client rejects keys that resolve outside the files root. Hand clients a URL with `fileUrl(key)` (`$shared/utils/files`), which is served by `src/routes/files/[...key]/+server.ts`.

- **Docs:** `attachSourcePdf` stores the PDF and sets `sourceUrl`; it never converts. Claude reads the PDF and calls `doc.update`.
- **Branding:** images upload as base64 through `branding.uploadImage`, which returns a storage key. `branding.update` saves the key and deletes any file it replaces.

## Reports

A `Report` is markdown attached to an entity, with an optional `brandingId`. `getReport` resolves branding as: the report's own, else the default profile, else none. The print view is `/app/reports/<id>/print`.

`createReport` and `updateReport` run `validateChartBlocks` (`$shared/types/charts`) and reject the write if any chart block is invalid. Chart blocks are fenced `chart` code blocks containing JSON:

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
7. If it's a new entity type: add it to `ENTITY_TYPES`, `entityPath()` and `resolveEntityLabel()`, add a list + detail page using `EntityDetailPage`, and add it to the `AppShell` nav
