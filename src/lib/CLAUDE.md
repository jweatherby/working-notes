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

The one app-wide context is the open notebook. The `/app` layout provides `data.notebook` and `data.notebooks`, and the server picks the notebook for every request, so components never pass it to the API.
- Switch with `switchNotebook(id)` (`$lib/notebook/switch`). It's a full page load, so no ids, lists or popups from the old notebook carry over. Never edit the cookie or `?notebook=` yourself.
- Anything cached in the browser must be keyed by notebook id (QuickFinder's localStorage is).
- The layout also applies the notebook's default branding: its primary colour replaces the `--accent*` tokens (and `--focus`) through `.branded` in `styles/_tokens.scss`. Components keep using the accent tokens and never read branding colours for app chrome.
- `notebook/components/`: `NotebookSwitcher` (the chevron beside the notebook title in the top bar, props `current`, `notebooks`), `NotebookForm` (create, or rename with `initial`), and `NewNotebookPopup` (global `?popup=new-notebook`; opens the new notebook).

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
- **Layout classes** (`styles/_layout.scss`): `.page`, `.page-header`, `.card` (`compact`, `hover`), `.section` + `.section-header` (with `.count`), `.eyebrow`, `.list` + `.list-row` (`.grow`, `.meta`, `.row-actions` shown on hover, `.active`; `.list.divided` for bordered rows), `.badge` (`accent success warning danger muted`), `.empty` (`boxed`), `.tabs` + `.tab`, `.toolbar`, `.drawer-handle`, `.drawer-backdrop`, utilities `.muted .text-2 .text-xs .text-sm .mono .truncate .pre-line .ml-auto`. Put `.pre-line` on every plain-text description so its line breaks show.

### UI primitives (`src/lib/ui/`)

| Component | Props | Use for |
|---|---|---|
| `Field` | `label`, `hint?`, `error?`, children snippet `({ id })` | every labelled form control |
| `InlinePicker` | `label`, `options: {id,name,group?}[]`, `placeholder?`, `onPick(id)` | single-pick relationship edits (assign lead, add member, set parent). Options with a `group` render in an `<optgroup>`; owner pickers use composite ids like `TEAM:<id>`. Renders nothing when there are no options |
| `ProgressBar` | `value: number \| null` (0–1), `tone?: accent \| success \| warning \| danger`, `label?` | any 0–1 measure, such as goal progress |
| `SearchPicker` | `label`, `options: {id,name,scope?}[]`, `scopes?: {id,label,slash}[]`, `loading?`, `onPick(id)`, `onCancel` | picking one item from a list too long for a `<select>` (link targets). Type to search; a query starting with `/` names a scope (singular words: `/person`, `/project`). `/` lists them, `/team console` searches teams, and a partly typed word completes in the box once a space follows it (`/pro ` → `/project `, the highlighted one when several match). The query stays plain text, never a chip. Enter picks the highlighted row; Escape cancels. Parsing and matching are in `search-picker.ts`. Shows an error only when `onPick` throws |
| `GroupedOptions` | `options: {id,name,group?}[]` | the `<option>`s inside a `<select>`, under `<optgroup>`s when options carry a `group` (owner selects in `GoalForm` and `ProjectForm`; `InlinePicker` uses it too) |
| `ConfirmButton` | `label`, `confirmLabel?`, `onConfirm`, `variant: link \| button \| icon`, `timeoutMs?` | any destructive action. Never use `window.confirm()` |
| `Menu` | `label`, `items: {label, href?, onSelect?, current?, divided?}[]`, `trigger?` snippet, `iconOnly?` (just a chevron, named by `label`), `align?: start \| end` | a button that opens a short list of links and actions (the notebook switcher). Handles Escape, click-outside and arrow keys. Not for picking a relationship; that's `InlinePicker` |
| `EmptyState` | `message`, `boxed?`, `small?`, children (action) | "nothing here yet" |
| `PageHeader` | `title`, `description?`, children (actions) | top of every list page |
| `ParamSelect` | `param`, `options: {id,name,group?}[]`, `defaultValue`, `ariaLabel` | a list page's toolbar select whose value lives in one query parameter (picking `defaultValue` removes it). The projects page's team filter (`?team=`) and grouping (`?group=`) use it |
| `ArchiveFilter` | – | the Active / Archived / All select in a list page's `.toolbar.filters`, built on `ParamSelect`. It sets `?archived=`; the page's load passes `parseArchiveFilter(url.searchParams.get('archived'))` to `*.list` |
| `DisclosureButton` | `expanded`, `label`, `onToggle` | the chevron that shows or hides a tree row's children (collapsible sub-projects). Use `flattenTree(forest, isCollapsed)` from `$shared/utils/hierarchy` for the rows |
| `PencilIcon` | – | the edit affordance, inside `<button class="btn icon sm" aria-label="Edit …">` |
| `popup-url.ts` | `openPopup(id, extra?)`, `closePopup({ invalidate?, clear? })` | opening and closing `Popup` (`?popup=<id>`) |
| `submit.ts` | `submit(fn)`, `submitOrThrow(fn)`, `errorMessage(e)` | all tRPC mutations from the UI |

`Popup` (`common/Popup.svelte`, props `id`, `title`, `size?`, `clearParams?`) is for entity create/edit only; small edits render inline.

### Rules for UI code

Use a standard component or class before writing markup or styles yourself. If none fits, extend the primitive in `src/lib/ui/` or the partial in `src/routes/styles/`, and update the tables above. Don't make a one-off copy.

**Pages**
- A list page is `<div class="page">`, then `PageHeader` (its primary action is `.btn primary`), then the content, then `EmptyState boxed` with the same action when the list is empty. `src/routes/app/people/+page.svelte` is the reference.
- An entity detail page is `EntityDetailPage`. It supplies only `renderOverview`, `renderAssetHeader` and `renderEditForm`. Never rebuild the sidebar, notes panel, breadcrumb or edit popup.
- Inside an overview, group content in `.section`, with a `.section-header` holding an `h4` and `.count`. Render collections as `.list` + `.list-row`, with per-row actions in `.row-actions`. Put a wide table in `.table-wrap`.

**Forms and mutations**
- Every labelled control goes in `Field` and uses the `id` from its snippet. Don't write a raw `<label>` for a form control. Toolbar filters without a visible label are the exception; give them an `aria-label`.
- Entity create and edit use the domain `*Form` component (`PersonForm`, `TeamForm`, `DepartmentForm`, `ProjectForm`, `GoalForm`, `PageForm`, `TodoForm`) inside a `Popup`. Don't rebuild the form fields on a page.
- Open and close popups only through `openPopup` and `closePopup`. Never edit `?popup=` by hand. After a write, call `closePopup({ invalidate: true })`.
- Send every tRPC mutation through `submit()` and handle `outcome.ok`. Most procedures return `Result`, so a failed call does not throw. A bare `await trpc().x.mutate(...)` drops the error without a word.
- `InlinePicker` and `ConfirmButton` show an error only when their callback throws. In `onPick` and `onConfirm` (and a form's `onDelete`, which goes to a `ConfirmButton`), call `submitOrThrow(() => trpc()….mutate(…))`.
- Everywhere else, use `submit()` and render `outcome.error`. Show a form or list error in `.form-error`, a field error through `Field`'s `error` prop, and an error beside an inline control in `.inline-error`. Don't write inline `style="color: …"`.

**Actions**
- Use `ConfirmButton` for every destructive action (delete, remove, detach). Use `variant="icon"` inside `.row-actions`, `link` in text and `button` in form actions. Never call `window.confirm()` or `alert()`.
- Use `InlinePicker` to set or add one relationship (lead, member, parent), or `SearchPicker` when the choices span several entity types or are too many to scroll. Don't write `<details>`/`<select onchange>` pickers.
- Edit affordances are `PencilIcon` inside `.btn icon sm`, with an `aria-label` that names the entity.
- Every clickable control is `.btn` plus modifiers, or an `<a>`. A bare `<button>` is unstyled on purpose. Show loading with `disabled` + `aria-busy` and a text swap, not a spinner.
- Show todo state with `todo/components/StatusDot` and `PriorityBadge`. Don't restyle status or priority locally.

**Empty and loading states**
- Use `EmptyState` for every "nothing here" message: `boxed` for a whole page, plain inside a section, `small` in sidebar widgets. Don't hand-write `<p class="empty">`.

**Styling**
- Component `<style>` blocks handle layout only (flex, grid, positioning). Colour, font size, spacing, radius, shadow and z-index come from tokens (`var(--…)`). Don't use hex, `rgb()`, named colours or `px` for these.
- Pixel literals are allowed only for fixed geometry the token scale can't express: hairline borders (`1px`), icon and dot sizes, chart and org-map cell widths.
- Brand colours from a `Branding` record are the only values allowed in `style=` attributes (for example, swatches and the branding preview). Pass dynamic numbers as CSS custom properties (`style="--depth: {n}"`), not as whole declarations.
- Don't restyle a global class (`.btn`, `.card`, `.list-row`, `.badge`, inputs) from inside a component. Add a modifier to the partial instead.
- Use the breakpoint mixins (`mobile`, `below-md`, `tablet-up`, `desktop-up`) from `_variables.scss`. A raw `@media` width is only for shell layout that needs its own breakpoint (today, `DetailLayout` at 849px and `AppShell` at 768–1149px). Leave a comment saying why.

## Charts and diagrams

- `src/lib/report/chart-render.ts` is the only chart renderer. `renderChart(el, spec, branding)` draws a `ChartSpec` in brand colours; `mountCharts(container, branding, sections?)` replaces rendered ```` ```chart ```` code blocks (and legacy `[data-chart-key]` placeholders) inside a container.
- It's used by `MarkdownRenderer` (docs and notes, no branding), `report/components/MarkdownReport` (branded print view) and `shared/components/milkdown-chart-plugin` (live previews in the editor).
- Destroy the charts it returns when content changes or the component unmounts.
- Mermaid diagrams render in `MarkdownRenderer` from `<pre>` blocks starting with a mermaid keyword.

## Shared components

| Component | Props | Owns |
|---|---|---|
| `common/EntityDetailPage` | `entityType`, `entityId`, `entityName`, `breadcrumbLabel`, `breadcrumbHref`, `editPopupTitle`, `docs`, `notes`, `todos`, `reports?`, `relations?`, snippets `renderOverview({ openEdit })`, `renderAssetHeader`, `renderEditForm({ onSuccess, onCancel })` | Detail shell: sidebar (docs unless `acceptsDocs` says no, as on wiki pages; todos, reports, related), right-panel notes, center pane (overview/doc/note/todo), edit popup. `loadEntityAssets` (`$shared/trpc/load-entity-assets`) loads docs, notes, todos, reports and relations |
| `common/DocsManager` | `docs`, `activeDocId`, `onSelect`, `onStartAdd`, `onRemove`, `onReorder` | Doc list with reorder |
| `common/DocEditor` | `title`, `content`, `hasSourcePdf?`, `converting?`, `pdfNotice?` (`{ tone: warning \| error, message }`), `onSave`, `onSaveTitle?`, `onUploadPdf?`, `onOpenSourcePdf?`, `onConvertPdf?`, `onClose?` | Editor/Markdown/Preview tabs, "Attach PDF" (only while no PDF is attached), "Convert with Claude" (only while the doc has a PDF and no content). `EntityDetailPage` owns the conversion state and converts a PDF attached to an empty doc straight away |
| `common/MarkdownRenderer` | `content`, `placeholder?` | Markdown + charts + mermaid |
| `common/NotesList` | `notes`, `onEdit?`, `onRemove?`, `maxHeight?` | Note list with clamp/expand |
| `report/components/ReportsWidget` | `entityType`, `entityId`, `reports` | Sidebar report list + "new report" |
| `relation/components/RelationsWidget` | `entityType`, `entityId`, `groups` (`RelationGroup[]`), `readOnly?` | Sidebar "Related" list grouped by label, with a remove button on every row except `MENTIONS`. The header's "+" (hidden when `readOnly`, i.e. archived) opens `AddRelation` |
| `relation/components/AddRelation` | `self` (`RelationEnd` from `relationEnd()` in `$shared/utils/relations`), `onDone` | Kind select ("Related to", "Depends on", "Needed by"; the inverse swaps the ends via `toRelationInput`), then a `SearchPicker` over `loadRelationTargets` (`$shared/trpc/load-relation-targets`) scoped by `RELATION_TARGET_SCOPES`. Picking a target adds the link. No note field for now |
| `{person,team,department,project}/components/*Form` | `initial?`, `onSuccess`, `onCancel?`, `onDelete?` (`PersonForm` also `leadOptions?`, `ProjectForm` also `ownerOptions?`) | Create/edit forms, used in list popups, detail edit popups and Org Map |
| `goal/components/GoalForm` | `initial?`, `ownerOptions`, `onSuccess`, `onCancel?`, `onDelete?` | Goal create/edit: title, description, owner, period, status, unit, baseline, target. Get `ownerOptions` (grouped by type, for this form and `ProjectForm`) from `loadOwnerOptions(client)` in `$shared/trpc/load-owner-options` |
| `page/components/PageForm` | `initial?`, `onSuccess`, `onCancel?`, `onDelete?` | Page create/edit: title, kind, and property fields from `PAGE_KIND_FIELDS`. Content is edited on the page itself |
| `goal/components/ProgressLineChart` | `checkIns`, `baseline?`, `target?`, `unit?` | Check-in values over time with the target line, drawn with `renderChart` |
| `goal/components/GoalRows` | `goals`, `showOwner?`, `removeLabel?`, `onRemove?` | Goals as `.list-row`s with period, status badge and progress; used for sub-goals and a project's goals |
| `goal/components/OwnedWork` | `goals`, `projects` | The "Goals" and "Projects owned" sections on person, team and department overviews |
| `todo/components/TodoForm` | `entityType?`, `entityId?`, `editId?`, `onSuccess`, `onCancel?` | Todo create/edit; asks for the entity when none is given |
| `todo/components/CreateTodoPopup` | – | Global `?popup=todo[&todo=<id>]`, a `Popup` around `TodoForm`; infers the entity from the current detail route |
| `report/components/MarkdownReport` | `markdown`, `branding?`, `sections?` | Branded report rendering (logo, heading/table colours, charts) |
| `shared/components/MilkdownEditor` | `value`, `onChange`, `branding?`, `sections?` | WYSIWYG markdown with live chart previews |

Use `EntityDetailPage` for every entity detail page; the page supplies only the overview and edit form.
