# Routes Conventions — `src/routes/`

Routes are thin entry points: load data in `+page.server.ts`, render components from `src/lib/`.

## Structure

- `/` redirects to `/app`, the home dashboard: open todos (`home.todos`), latest updates (`home.updates`) and a clickable relation graph (`home.graph`, laid out by `$lib/home/graph-layout.ts`).
- `app/` is the app: `projects`, `orgmap`, `people`, `teams`, `departments`, `todos`, `reports`, `branding`. `app/+layout.server.ts` only loads the default branding icon for the nav.
- `app/reports/[id]/print/+page@.svelte` resets to the root layout (no app chrome), so the page prints cleanly to PDF. Mark on-screen-only controls with `class="no-print"`.
- `files/[...key]/+server.ts` serves locally stored files (doc PDFs, branding images).
- `api/trpc/` is handled by `trpcHandle` in `src/hooks.server.ts`.
- `hooks.server.ts` `init` runs `ensureDatabase()` (migrations and WAL) once before the server handles requests.

## Loading data

```ts
export const load: PageServerLoad = async ({ fetch, params }) => {
  const client = trpc(fetch);
  const result = await client.person.get.query({ id: params.id });
  if (!result.ok) error(404, 'Person not found');
  return { person: result.value };
};
```

Use `trpc(fetch)` so SSR requests pass through the same guard and validation as the browser and the CLI. Calling operations directly with `getRegistry()` is acceptable for read-only aggregate pages (e.g. `orgmap`).

## Security (`src/hooks.server.ts`)

There is no auth; `localOnlyGuard` is the only protection. It returns 403 for any request whose hostname isn't `localhost`, `127.0.0.1` or `[::1]`, and for any `/api/trpc` request without `x-working-notes: 1`. Don't add routes that bypass it, don't add CORS headers, and don't bind the server to anything but loopback.

## Layout notes

Entity list layouts (`people`, `teams`, `departments`, `projects`, `todos`) set `layoutConfig.collapseInfoPanel` so the notes panel collapses on medium screens.
