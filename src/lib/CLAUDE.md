# Frontend Conventions — `src/lib/`

`src/lib/` holds frontend code: components (per domain), stores (centralized), and chart rendering. Anything the backend also imports belongs in `src/shared/`.

```
src/lib/
├── stores/            # ALL Svelte stores — centralized
├── common/            # App-wide components (shell, entity detail page, editors, renderers)
├── report/            # chart-render.ts + report components
├── {domain}/components/
└── shared/components/ # Reusable, logic-free components (Milkdown editor + plugins)
```

## Data access

Components call the API through `trpc()` from `$shared/trpc/client` (a browser singleton; pass SvelteKit's `fetch` in load functions). The client always sends the `x-working-notes` header; never call `/api/trpc` with a bare `fetch`.

There is no session, user or org anywhere in the UI, and nothing is gated on ownership: everything is editable.

## Stores

Use classic Svelte stores (`writable`, `readable`, `derived`), not rune modules. Entity caches use a normalized `{ [entityType]: { [id]: entity } }` shape, and lists hold ids.

## Svelte

- Svelte 5 syntax: `$props()`, `$state()`, `$derived()`, `{@render children()}`
- `<style lang="scss">`, scoped. Variables/mixins from `src/routes/_variables.scss` are auto-injected.
- Keep components small; heavy logic goes in stores or utils.

## Charts and diagrams

- `src/lib/report/chart-render.ts` is the only chart renderer. `renderChart(el, spec, branding)` draws a `ChartSpec` in brand colours; `mountCharts(container, branding, sections?)` replaces rendered ```` ```chart ```` code blocks (and legacy `[data-chart-key]` placeholders) inside a container.
- It's used by `MarkdownRenderer` (docs and notes, no branding), `report/components/MarkdownReport` (branded print view) and `shared/components/milkdown-chart-plugin` (live previews in the editor).
- Destroy the charts it returns when content changes or the component unmounts.
- Mermaid diagrams render in `MarkdownRenderer` from `<pre>` blocks starting with a mermaid keyword.

## Shared components

| Component | Props | Owns |
|---|---|---|
| `common/EntityDetailPage` | `entityType`, `entityId`, `entityName`, `breadcrumbLabel`, `breadcrumbHref`, `editPopupTitle`, `docs`, `notes`, `todos`, `reports?`, snippets `renderOverview`, `renderAssetHeader`, `renderEditForm` | Detail shell: sidebar (docs, todos, reports), right-panel notes, center pane (overview/doc/note/todo), edit popup |
| `common/DocsManager` | `docs`, `activeDocId`, `onSelect`, `onStartAdd`, `onRemove`, `onReorder` | Doc list with reorder |
| `common/DocEditor` | `title`, `content`, `hasSourcePdf?`, `onSave`, `onSaveTitle?`, `onUploadPdf?`, `onOpenSourcePdf?`, `onClose?` | Editor/Markdown/Preview tabs, PDF attach |
| `common/MarkdownRenderer` | `content`, `placeholder?` | Markdown + charts + mermaid |
| `common/NotesList` | `notes`, `onEdit?`, `onRemove?`, `maxHeight?` | Note list with clamp/expand |
| `report/components/ReportsWidget` | `entityType`, `entityId`, `reports` | Sidebar report list + "new report" |
| `report/components/MarkdownReport` | `markdown`, `branding?`, `sections?` | Branded report rendering (logo, heading/table colours, charts) |
| `shared/components/MilkdownEditor` | `value`, `onChange`, `branding?`, `sections?` | WYSIWYG markdown with live chart previews |

Use `EntityDetailPage` for every entity detail page; the page supplies only the overview and edit form.
