<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import type { EntityType } from '$shared/types/enums';
  import type { RelationGroup } from '$shared/types/relations';
  import DetailLayout from '$lib/common/DetailLayout.svelte';
  import DocsManager from '$lib/common/DocsManager.svelte';
  import DocEditor from '$lib/common/DocEditor.svelte';
  import NoteEditor from '$lib/common/NoteEditor.svelte';
  import Popup from '$lib/common/Popup.svelte';
  import TodoWidget from '$lib/todo/components/TodoWidget.svelte';
  import TodoForm from '$lib/todo/components/TodoForm.svelte';
  import ReportsWidget from '$lib/report/components/ReportsWidget.svelte';
  import RelationsWidget from '$lib/relation/components/RelationsWidget.svelte';
  import { createDocHandlers } from '$lib/common/use-doc-handlers';
  import { createNoteHandlers } from '$lib/common/use-note-handlers';
  import { rightPanelNotes, activeDrawer } from '$lib/stores/right-panel';
  import PencilIcon from '$lib/ui/PencilIcon.svelte';
  import { openPopup, closePopup } from '$lib/ui/popup-url';

  interface DocItem {
    readonly id: string;
    readonly title: string;
    readonly content: string;
    readonly sourceUrl?: string | null;
    readonly sortOrder: number;
  }

  interface NoteItem {
    readonly id: string;
    readonly parentId: string | null;
    readonly content: string;
    readonly createdAt: Date | string;
  }

  interface TodoItem {
    readonly id: string;
    readonly title: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly status: any;
    readonly priority: number;
    readonly targetDate: Date | null;
    readonly completedAt: Date | null;
  }

  interface ReportItem {
    readonly id: string;
    readonly title: string;
    readonly updatedAt: Date | string;
  }

  interface EditFormCtx {
    readonly onSuccess: () => Promise<void>;
    readonly onCancel: () => void;
  }

  interface OverviewCtx {
    readonly openEdit: () => void;
  }

  interface Props {
    readonly entityType: string;
    readonly entityId: string;
    readonly entityName: string;
    readonly breadcrumbLabel: string;
    readonly breadcrumbHref: string;
    readonly editPopupTitle: string;
    readonly docs: readonly DocItem[];
    readonly notes: readonly NoteItem[];
    readonly todos: readonly TodoItem[];
    readonly reports?: readonly ReportItem[];
    readonly relations?: readonly RelationGroup[];
    readonly renderOverview: Snippet<[OverviewCtx]>;
    readonly renderAssetHeader: Snippet;
    readonly renderEditForm: Snippet<[EditFormCtx]>;
  }

  const {
    entityType,
    entityId,
    entityName,
    breadcrumbLabel,
    breadcrumbHref,
    editPopupTitle,
    docs,
    notes,
    todos,
    reports = [],
    relations = [],
    renderOverview,
    renderAssetHeader,
    renderEditForm,
  }: Props = $props();

  const editPopupId = $derived(`edit-${entityType.toLowerCase()}`);

  // ----- Left drawer state -----
  let leftOpen = $state(false);

  const toggleLeft = () => {
    leftOpen = !leftOpen;
    activeDrawer.set(leftOpen ? 'left' : null);
  };

  $effect(() => {
    if ($activeDrawer !== 'left' && leftOpen) {
      leftOpen = false;
    }
  });

  // ----- Center pane state -----
  type CenterView =
    | { readonly type: 'overview' }
    | { readonly type: 'doc'; readonly id: string }
    | { readonly type: 'note'; readonly id: string }
    | { readonly type: 'newDoc' }
    | { readonly type: 'newNote' }
    | { readonly type: 'newTodo' }
    | { readonly type: 'editTodo'; readonly id: string };

  let center = $state<CenterView>({ type: 'overview' });
  let newDocTitleDraft = $state('Untitled');

  // If the active doc/note vanishes, return to overview.
  $effect(() => {
    const c = center;
    if (c.type === 'doc' && !docs.some((d) => d.id === c.id)) {
      center = { type: 'overview' };
    }
    if (c.type === 'note' && !notes.some((n) => n.id === c.id)) {
      center = { type: 'overview' };
    }
  });

  const activeDoc = $derived.by(() => {
    const c = center;
    return c.type === 'doc' ? docs.find((d) => d.id === c.id) ?? null : null;
  });

  const activeNote = $derived.by(() => {
    const c = center;
    return c.type === 'note' ? notes.find((n) => n.id === c.id) ?? null : null;
  });

  const activeDocId = $derived.by(() => {
    const c = center;
    return c.type === 'doc' ? c.id : null;
  });

  const openDoc = (id: string) => { center = { type: 'doc', id }; };
  const openNote = (id: string) => { center = { type: 'note', id }; };
  const openNewNote = () => { center = { type: 'newNote' }; };
  const openNewDoc = () => {
    newDocTitleDraft = 'Untitled';
    center = { type: 'newDoc' };
  };
  const openNewTodo = () => { center = { type: 'newTodo' }; };
  const openEditTodo = (id: string) => { center = { type: 'editTodo', id }; };
  const closeCenter = () => { center = { type: 'overview' }; };

  const handleTodoSuccess = async () => {
    center = { type: 'overview' };
    await invalidateAll();
  };

  // ----- Handlers -----
  const docHandlers = $derived(
    createDocHandlers(
      trpc().doc,
      entityType,
      entityId,
      () => activeDocId,
      (id) => { center = id ? { type: 'doc', id } : { type: 'overview' }; },
    ),
  );

  const noteHandlers = $derived(
    createNoteHandlers(trpc().note, entityType, entityId),
  );

  $effect(() => {
    rightPanelNotes.set({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notes: notes as any,
      onAdd: noteHandlers.handleAddNote,
      onRemove: noteHandlers.handleRemoveNote,
      onStartAdd: openNewNote,
      onEdit: (id) => openNote(id),
    });
  });
  onDestroy(() => rightPanelNotes.set(null));

  const handleSaveNote = async (content: string) => {
    if (center.type !== 'note') return;
    await noteHandlers.handleUpdateNote(center.id, content);
  };

  const handleCreateNote = async (content: string) => {
    await noteHandlers.handleAddNote(content);
    center = { type: 'overview' };
  };

  const handleCreateDoc = async (content: string) => {
    await docHandlers.handleAddDoc(newDocTitleDraft);
    // handleAddDoc has set center = { type: 'doc', id: newId }.
    if (content) await docHandlers.handleSaveDoc(content);
  };

  const handleDraftDocTitle = async (title: string) => {
    newDocTitleDraft = title;
  };

  const handleCreateDocFromPdf = async (file: File) => {
    await docHandlers.handleAddDoc(newDocTitleDraft);
    await docHandlers.handleUploadPdf(file);
  };

  // ----- Edit popup -----
  const openEdit = () => { openPopup(editPopupId); };
  const handleEditSuccess = () => closePopup({ invalidate: true });
  const handleEditCancel = () => { closePopup(); };

  const todoEntityType = $derived(entityType as EntityType);
</script>

<svelte:head><title>{entityName}</title></svelte:head>

<DetailLayout {leftOpen} onToggleLeft={toggleLeft}>
  {#snippet sidebar()}
    <div class="section">
      <DocsManager
        {docs}
        {activeDocId}
        onSelect={openDoc}
        onStartAdd={openNewDoc}
        onRemove={docHandlers.handleRemoveDoc}
        onReorder={docHandlers.handleReorderDocs}
      />
    </div>
    <div class="section">
      <TodoWidget
        {entityType}
        {entityId}
        {todos}
        onCreate={openNewTodo}
        onEditTodo={openEditTodo}
      />
    </div>
    <div class="section">
      <ReportsWidget {entityType} {entityId} {reports} />
    </div>
    <div class="section">
      <RelationsWidget groups={relations} />
    </div>
  {/snippet}

  <div class="center-pane">
    <div class="center-header">
      <nav aria-label="breadcrumb">
        <ul>
          <li><a href={breadcrumbHref}>{breadcrumbLabel}</a></li>
          <li>{entityName}</li>
        </ul>
      </nav>
      <div class="asset-header-row">
        <div class="asset-header-content">{@render renderAssetHeader()}</div>
        <button type="button" class="btn icon sm edit-btn" onclick={openEdit} aria-label="Edit {entityName}" title="Edit"><PencilIcon /></button>
      </div>
    </div>

    {#if activeDoc}
      <DocEditor
        title={activeDoc.title}
        content={activeDoc.content}
        hasSourcePdf={!!activeDoc.sourceUrl}
        onSave={docHandlers.handleSaveDoc}
        onSaveTitle={docHandlers.handleSaveTitle}
        onUploadPdf={docHandlers.handleUploadPdf}
        onOpenSourcePdf={docHandlers.handleOpenSourcePdf}
        onUploadImage={docHandlers.handleUploadImage}
        onResolveImages={docHandlers.handleResolveImages}
        onClose={closeCenter}
      />
    {:else if activeNote}
      <NoteEditor
        noteId={activeNote.id}
        content={activeNote.content}
        onSave={handleSaveNote}
        onClose={closeCenter}
      />
    {:else if center.type === 'newNote'}
      <NoteEditor
        noteId="__new__"
        content=""
        onSave={handleCreateNote}
        onClose={closeCenter}
      />
    {:else if center.type === 'newDoc'}
      <DocEditor
        title={newDocTitleDraft}
        content=""
        onSave={handleCreateDoc}
        onSaveTitle={handleDraftDocTitle}
        onUploadPdf={handleCreateDocFromPdf}
        onClose={closeCenter}
        autoEditTitle
      />
    {:else if center.type === 'newTodo'}
      <section class="card pane-card">
        <div class="pane-header">
          <h2>New todo</h2>
          <button type="button" class="btn icon" aria-label="Close" onclick={closeCenter}>&times;</button>
        </div>
        <TodoForm entityType={todoEntityType} {entityId} onSuccess={handleTodoSuccess} onCancel={closeCenter} />
      </section>
    {:else if center.type === 'editTodo'}
      <section class="card pane-card">
        <div class="pane-header">
          <h2>Edit todo</h2>
          <button type="button" class="btn icon" aria-label="Close" onclick={closeCenter}>&times;</button>
        </div>
        <TodoForm entityType={todoEntityType} {entityId} editId={center.id} onSuccess={handleTodoSuccess} onCancel={closeCenter} />
      </section>
    {:else}
      <div class="overview">
        {@render renderOverview({ openEdit })}
      </div>
    {/if}
  </div>
</DetailLayout>

<Popup id={editPopupId} title={editPopupTitle}>
  {@render renderEditForm({ onSuccess: handleEditSuccess, onCancel: handleEditCancel })}
</Popup>

<style lang="scss">
  .center-pane {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }
  .center-header {
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);
    padding-bottom: var(--sp-3);
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    nav[aria-label='breadcrumb'] ul { margin-bottom: var(--sp-1); }
  }
  .asset-header-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    .edit-btn { opacity: 0; transition: opacity var(--ease); }
    &:hover .edit-btn, .edit-btn:focus-visible { opacity: 1; }
  }
  .asset-header-content {
    flex: 1;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-2);
    min-width: 0;
    :global(.asset-h-name) { font-size: var(--fs-lg); font-weight: 600; letter-spacing: -0.01em; }
    :global(.asset-h-meta) { font-size: var(--fs-md); color: var(--text-2); }
  }
  .pane-card { max-width: 640px; }
  .pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--sp-3);
    h2 { margin: 0; font-size: var(--fs-base); }
  }
  .overview {
    display: flex;
    flex-direction: column;
    gap: var(--sp-6);
    max-width: 720px;
  }
</style>
