<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy } from 'svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { trpc } from '$shared/trpc/client';
  import DetailLayout from '$lib/common/DetailLayout.svelte';
  import DocsManager from '$lib/common/DocsManager.svelte';
  import DocEditor from '$lib/common/DocEditor.svelte';
  import NoteEditor from '$lib/common/NoteEditor.svelte';
  import Popup from '$lib/common/Popup.svelte';
  import TodoWidget from '$lib/todo/components/TodoWidget.svelte';
  import TodoForm from '$lib/todo/components/TodoForm.svelte';
  import ReportsWidget from '$lib/report/components/ReportsWidget.svelte';
  import { createDocHandlers } from '$lib/common/use-doc-handlers';
  import { createNoteHandlers } from '$lib/common/use-note-handlers';
  import { rightPanelNotes, activeDrawer } from '$lib/stores/right-panel';

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

  // ----- Popup -----
  const openEdit = () => {
    const url = new URL($page.url);
    url.searchParams.set('popup', editPopupId);
    goto(url.toString(), { replaceState: true, noScroll: true });
  };

  const handleEditSuccess = async () => {
    const url = new URL($page.url);
    url.searchParams.delete('popup');
    await goto(url.toString(), {
      replaceState: true,
      noScroll: true,
      invalidateAll: true,
    });
  };
</script>

<svelte:head><title>{entityName}</title></svelte:head>

<nav aria-label="breadcrumb">
  <ul>
    <li><a href={breadcrumbHref}>{breadcrumbLabel}</a></li>
    <li>{entityName}</li>
  </ul>
</nav>

<DetailLayout {leftOpen} onToggleLeft={toggleLeft}>
  {#snippet sidebar()}
    <div class="section-block">
      <DocsManager
        {docs}
        {activeDocId}
        onSelect={openDoc}
        onStartAdd={openNewDoc}
        onRemove={docHandlers.handleRemoveDoc}
        onReorder={docHandlers.handleReorderDocs}
      />
    </div>
    <div class="section-block">
      <TodoWidget
        {entityType}
        {entityId}
        {todos}
        onCreate={openNewTodo}
        onEditTodo={openEditTodo}
      />
    </div>
    <div class="section-block">
      <ReportsWidget {entityType} {entityId} {reports} />
    </div>
  {/snippet}

  {#if activeDoc}
    <div class="center-pane">
      <div class="center-header">
        <div class="asset-header-content">{@render renderAssetHeader()}</div>
      </div>
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
    </div>
  {:else if activeNote}
    <div class="center-pane">
      <div class="center-header">
        <div class="asset-header-content">{@render renderAssetHeader()}</div>
      </div>
      <NoteEditor
        noteId={activeNote.id}
        content={activeNote.content}
        onSave={handleSaveNote}
        onClose={closeCenter}
      />
    </div>
  {:else if center.type === 'newNote'}
    <div class="center-pane">
      <div class="center-header">
        <div class="asset-header-content">{@render renderAssetHeader()}</div>
      </div>
      <NoteEditor
        noteId="__new__"
        content=""
        onSave={handleCreateNote}
        onClose={closeCenter}
      />
    </div>
  {:else if center.type === 'newDoc'}
    <div class="center-pane">
      <div class="center-header">
        <div class="asset-header-content">{@render renderAssetHeader()}</div>
      </div>
      <DocEditor
        title={newDocTitleDraft}
        content=""
        onSave={handleCreateDoc}
        onSaveTitle={handleDraftDocTitle}
        onUploadPdf={handleCreateDocFromPdf}
        onClose={closeCenter}
        autoEditTitle
      />
    </div>
  {:else if center.type === 'newTodo'}
    <div class="center-pane">
      <div class="center-header">
        <div class="asset-header-content">{@render renderAssetHeader()}</div>
      </div>
      <h3 class="pane-title">New Todo</h3>
      <TodoForm
        entityType={entityType as 'PROJECT' | 'PERSON' | 'TEAM' | 'DEPARTMENT'}
        {entityId}
        onSuccess={handleTodoSuccess}
        onCancel={closeCenter}
      />
    </div>
  {:else if center.type === 'editTodo'}
    <div class="center-pane">
      <div class="center-header">
        <div class="asset-header-content">{@render renderAssetHeader()}</div>
      </div>
      <h3 class="pane-title">Edit Todo</h3>
      <TodoForm
        entityType={entityType as 'PROJECT' | 'PERSON' | 'TEAM' | 'DEPARTMENT'}
        {entityId}
        editId={center.id}
        onSuccess={handleTodoSuccess}
        onCancel={closeCenter}
      />
    </div>
  {:else}
    <div class="center-pane">
      <div class="center-header">
        <div class="asset-header-content">{@render renderAssetHeader()}</div>
      </div>
      {@render renderOverview({ openEdit })}
    </div>
  {/if}
</DetailLayout>

<Popup id={editPopupId} title={editPopupTitle}>
  {@render renderEditForm({ onSuccess: handleEditSuccess })}
</Popup>

<style lang="scss">
  .section-block {
    margin-top: 2rem;
  }
  .section-block:first-child { margin-top: 0; }
  .center-pane {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .center-header {
    position: sticky;
    top: 0.5rem;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    margin-bottom: 0.75rem;
    background: var(--color-surface-alt, var(--gray-1, #f4f4f7));
    border: 1px solid var(--color-muted-border);
    border-left: 3px solid var(--color-primary);
    border-radius: $radius-md;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  .asset-header-content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .pane-title {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }
  .placeholder {
    color: var(--color-muted);
    font-size: 0.9rem;
  }
  .close-btn {
    all: unset;
    cursor: pointer;
    font-size: 1.25rem;
    color: var(--color-muted);
    padding: 0 0.25rem;
    &:hover { color: var(--color-primary); }
  }
</style>
