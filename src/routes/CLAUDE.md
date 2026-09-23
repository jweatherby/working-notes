# Routes Conventions — `src/routes/`

Routes are thin entry points: load data in `+page.server.ts`, render components from `src/lib/`.

## Structure

- `/` redirects to `/app`, the home dashboard: open todos (`home.todos`), latest updates (`home.updates`) and a clickable relation graph (`home.graph`, laid out by `$lib/home/graph-layout.ts`).
- `app/` is the app: `projects`, `goals`, `wiki` (pages), `orgmap`, `people`, `teams`, `departments`, `todos`, `reports`, `branding`, `notebooks`. Person, team and department pages show the goals and projects they own; project pages show the owner and linked goals. `app/+layout.server.ts` loads the open notebook and the notebook list (for the switcher), and the notebook's default branding: its icon for the nav and its primary colours, which `app/+layout.svelte` applies with `.branded`.
- Entity detail pages read `?doc=<id>` (or `?doc=new`) to open a doc in the centre pane; see `EntityDetailPage` in `src/lib/CLAUDE.md`.
- `app/notebooks` lists notebooks: open one, rename it, or make it Claude's default. Creating one is the global `?popup=new-notebook`.
- `app/reports/[id]/print/+page@.svelte` and `app/docs/[id]/print/+page@.svelte` reset to the root layout (no app chrome), so the page prints cleanly to PDF. Mark on-screen-only controls with `class="no-print"`.
- The doc print page (a doc's "Export PDF") reads `?branding=<id>|none` (left out = the default branding) and `?header=0` through `lib/doc/print-options.ts`, and its toolbar rewrites them. "Download PDF" saves the `.sheet` with `lib/doc/export-pdf.ts`. It isn't gated by `features.reports`.
- `files/[...key]/+server.ts` serves locally stored files (doc PDFs, branding images) from the request's notebook.
- `api/trpc/` is handled by `trpcHandle` in `src/hooks.server.ts`.
- `hooks.server.ts` `init` puts the data directory in the notebook layout and runs `ensureDatabase()` (migrations and WAL) for the default notebook before the server handles requests. Other notebooks are prepared the first time a request uses them.

## Loading data

```ts
export const load: PageServerLoad = async ({ fetch, params }) => {
  const client = trpc(fetch);
  const result = await client.person.get.query({ id: params.id });
  if (!result.ok) error(404, 'Person not found');
  return { person: result.value };
};
```

Use `trpc(fetch)` so SSR requests pass through the same guard and validation as the browser and the CLI. Calling operations directly is acceptable for read-only aggregate pages (e.g. `orgmap`): use `getReadyRegistry(locals.notebook.id)`, never a notebook of your own choosing.

## Security (`src/hooks.server.ts`)

There is no auth; `localOnlyGuard` is the only protection. It returns 403 for any request whose hostname isn't `localhost`, `127.0.0.1` or `[::1]`, and for any `/api/trpc` request without `x-working-notes: 1`. Don't add routes that bypass it, don't add CORS headers, and don't bind the server to anything but loopback.

`notebookHandle` runs next and sets `event.locals.notebook` for every request:
- `?notebook=<id or name>` on a page switches: it sets the `wn-notebook` cookie (HttpOnly, SameSite=Strict) and redirects to the same URL without the parameter. An unknown notebook is a 404.
- Otherwise the cookie, and if that notebook is gone, the default.

Links Claude gives the user add `?notebook=<id>`, so they open in the right notebook. The UI switches with `switchNotebook(id)`, a full page load to `/app?notebook=<id>`.

## Styles

- `styles.scss` is the global entry (imported once in `+layout.svelte`). It only `@use`s the partials in `styles/`: `_tokens` (design tokens on `:root`, plus `.branded`, which swaps in a notebook's brand colour), `_base` (reset, elements, tables, breadcrumb), `_controls` (`.btn`, fields, forms, tabs, toolbar), `_layout` (page, card, list, badge, drawer, utilities), `_print` (`.no-print`).
- Vite's `additionalData` injects `_variables.scss` into the entry and component `<style>` blocks only. Partials reached through `@use` must `@use '../_variables.scss' as *` themselves.
- `_variables.scss` holds only breakpoints, font stacks and mixins (`mobile`, `below-md`, `tablet-up`, `desktop-up`, `flex-*`, `visually-hidden`). Colours, type, spacing and radii are CSS custom properties in `styles/_tokens.scss`.
- The token and class vocabulary is documented in `src/lib/CLAUDE.md` § Design system.

## Layout notes

- The top bar (`$lib/common/AppShell`) starts with the brand icon and the open notebook's name (a link to Home), then the switcher chevron (`$lib/notebook/components/NotebookSwitcher`). Its `LINKS` show Home, Org Map, Projects, Goals, Wiki, Reports and Todos, with Branding as a secondary link and a search button that opens the ⌘K finder. Under 768px it collapses to a hamburger drawer.
- Entity list layouts (`people`, `teams`, `departments`, `projects`, `goals`, `wiki`, `todos`) set `layoutConfig.collapseInfoPanel` so the notes panel collapses on medium screens.
