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
- `<style lang="scss">`, scoped. Breakpoint mixins from `src/routes/_variables.scss` are auto-injected.
- Keep components small; heavy logic goes in stores or utils.

## Design system

Global styles live in `src/routes/styles/` (see `src/routes/CLAUDE.md`). Components only use the tokens and classes below; no hex, rgba or pixel literals for colour, type, spacing or radius.

- **Tokens** (`styles/_tokens.scss`, CSS custom properties on `:root`): surfaces `--bg --surface --surface-2 --surface-hover --surface-inset`; text `--text --text-2 --text-3`; borders `--border --border-strong`; accent `--accent --accent-hover --accent-soft --accent-text`; status `--danger --success --warning` (+ `-soft`); categorical `--viz-1..4`; type `--fs-xs/sm/md/base/lg/xl` (11–20px on a 14px root); space `--sp-1..10` (4px grid); radius `--r-sm/md/lg/full`; `--shadow-1..3`, `--focus`, `--scrim`, `--ease`; sizes `--control-h` (32px), `--control-h-sm` (26px), `--nav-h`, `--sidebar-w`, `--panel-w`; layers `--z-*`. A dark theme is a `[data-theme="dark"]` block reassigning the colour rows.
- **Buttons:** a bare `<button>` is a reset (no background, border or padding). Add `.btn` for a control, plus `primary`, `ghost`, `danger` (`danger solid` for filled), `link`, `sm`, `icon`, `block`. Loading is `aria-busy` plus a text swap. `.btn` also works on `<a>`.
- **Inputs** are styled at the element level (32px). Add `.sm` for 26px inline rows. Wrap label + control in `Field` (`$lib/ui/Field.svelte`), lay out with `.form-grid`, `.form-row` (`.thirds`) and `.form-actions`; show failures with `.form-error`.
- **Mutations** go through `submit()` from `$lib/ui/submit`, which turns both `Result`-returning and throwing procedures into `{ ok, value } | { ok, error }` so every form renders its error.
- **Layout classes** (`styles/_layout.scss`): `.page`, `.page-header`, `.card` (`compact`, `hover`), `.section` + `.section-header` (with `.count`), `.eyebrow`, `.list` + `.list-row` (`.grow`, `.meta`, `.row-actions` shown on hover, `.active`; `.list.divided` for bordered rows), `.badge` (`accent success warning danger muted`), `.empty` (`boxed`), `.tabs` + `.tab`, `.toolbar`, `.drawer-handle`, `.drawer-backdrop`, utilities `.muted .text-2 .text-xs .text-sm .mono .truncate .ml-auto`.

### UI primitives (`src/lib/ui/`)

| Component | Props | Use for |
|---|---|---|
| `Field` | `label`, `hint?`, `error?`, children snippet `({ id })` | every labelled form control |
| `InlinePicker` | `label`, `options: {id,name}[]`, `placeholder?`, `onPick(id)` | single-pick relationship edits (assign lead, add member, set parent). Renders nothing when there are no options |
| `ConfirmButton` | `label`, `confirmLabel?`, `onConfirm`, `variant: link \| button \| icon`, `timeoutMs?` | any destructive action. Never use `window.confirm()` |
| `EmptyState` | `message`, `boxed?`, children (action) | "nothing here yet" |
| `PageHeader` | `title`, `description?`, children (actions) | top of every list page |
| `popup-url.ts` | `openPopup(id, extra?)`, `closePopup({ invalidate?, clear? })` | opening and closing `Popup` (`?popup=<id>`) |
| `submit.ts` | `submit(fn)`, `errorMessage(e)` | all tRPC mutations from the UI |

`Popup` (`common/Popup.svelte`, props `id`, `title`, `size?`, `clearParams?`) is for entity create/edit only; small edits render inline.

## Charts and diagrams

- `src/lib/report/chart-render.ts` is the only chart renderer. `renderChart(el, spec, branding)` draws a `ChartSpec` in brand colours; `mountCharts(container, branding, sections?)` replaces rendered ```` ```chart ```` code blocks (and legacy `[data-chart-key]` placeholders) inside a container.
- It's used by `MarkdownRenderer` (docs and notes, no branding), `report/components/MarkdownReport` (branded print view) and `shared/components/milkdown-chart-plugin` (live previews in the editor).
- Destroy the charts it returns when content changes or the component unmounts.
- Mermaid diagrams render in `MarkdownRenderer` from `<pre>` blocks starting with a mermaid keyword.

## Shared components

| Component | Props | Owns |
|---|---|---|
| `common/EntityDetailPage` | `entityType`, `entityId`, `entityName`, `breadcrumbLabel`, `breadcrumbHref`, `editPopupTitle`, `docs`, `notes`, `todos`, `reports?`, snippets `renderOverview({ openEdit })`, `renderAssetHeader`, `renderEditForm({ onSuccess, onCancel })` | Detail shell: sidebar (docs, todos, reports), right-panel notes, center pane (overview/doc/note/todo), edit popup |
| `common/DocsManager` | `docs`, `activeDocId`, `onSelect`, `onStartAdd`, `onRemove`, `onReorder` | Doc list with reorder |
| `common/DocEditor` | `title`, `content`, `hasSourcePdf?`, `onSave`, `onSaveTitle?`, `onUploadPdf?`, `onOpenSourcePdf?`, `onClose?` | Editor/Markdown/Preview tabs, PDF attach |
| `common/MarkdownRenderer` | `content`, `placeholder?` | Markdown + charts + mermaid |
| `common/NotesList` | `notes`, `onEdit?`, `onRemove?`, `maxHeight?` | Note list with clamp/expand |
| `report/components/ReportsWidget` | `entityType`, `entityId`, `reports` | Sidebar report list + "new report" |
| `{person,team,department,project}/components/*Form` | `initial?`, `onSuccess`, `onCancel?`, `onDelete?` (`PersonForm` also `leadOptions?`) | Create/edit forms, used in list popups, detail edit popups and Org Map |
| `todo/components/TodoForm` | `entityType?`, `entityId?`, `editId?`, `onSuccess`, `onCancel?` | Todo create/edit; asks for the entity when none is given |
| `todo/components/CreateTodoPopup` | – | Global `?popup=todo[&todo=<id>]`, a `Popup` around `TodoForm`; infers the entity from the current detail route |
| `report/components/MarkdownReport` | `markdown`, `branding?`, `sections?` | Branded report rendering (logo, heading/table colours, charts) |
| `shared/components/MilkdownEditor` | `value`, `onChange`, `branding?`, `sections?` | WYSIWYG markdown with live chart previews |

Use `EntityDetailPage` for every entity detail page; the page supplies only the overview and edit form.
