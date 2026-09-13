<script lang="ts">
  import MarkdownEditor from '$lib/common/MarkdownEditor.svelte';
  import MarkdownRenderer from '$lib/common/MarkdownRenderer.svelte';

  interface Props {
    readonly title: string;
    readonly content: string;
    readonly hasSourcePdf?: boolean;
    readonly onSave: (content: string) => Promise<void>;
    readonly onSaveTitle?: (title: string) => Promise<void>;
    readonly onUploadPdf?: (file: File) => Promise<void>;
    readonly onOpenSourcePdf?: () => Promise<void>;
    readonly onUploadImage?: (file: File) => Promise<string>;
    readonly onResolveImages?: (keys: string[]) => Promise<Record<string, string>>;
    readonly onClose?: () => void;
    readonly autoEditTitle?: boolean;
  }

  const { title, content, hasSourcePdf, onSave, onSaveTitle, onUploadPdf, onOpenSourcePdf, onUploadImage, onResolveImages, onClose, autoEditTitle = false }: Props = $props();

  let editingTitle = $state(autoEditTitle);
  let titleDraft = $state(title);

  const startEditingTitle = () => {
    if (!onSaveTitle) return;
    titleDraft = title;
    editingTitle = true;
  };

  const commitTitle = async () => {
    editingTitle = false;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === title || !onSaveTitle) return;
    await onSaveTitle(trimmed);
  };

  const cancelTitle = () => {
    editingTitle = false;
    titleDraft = title;
  };

  const handleTitleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelTitle(); }
  };

  const focusOnMount = (node: HTMLInputElement) => { node.focus(); node.select(); };

  const pendingImages = new Map<string, File>();

  const STORAGE_RE = /storage:\/\/[^\s)]+/g;
  const hasStorageUrls = (md: string): boolean => /storage:\/\//.test(md);

  const resolveStorageUrls = async (md: string): Promise<string> => {
    if (!onResolveImages) return md;
    const keys = [...md.matchAll(STORAGE_RE)].map(m => m[0].replace('storage://', ''));
    if (!keys.length) return md;
    const urls = await onResolveImages(keys);
    return md.replace(STORAGE_RE, (match) => {
      const key = match.replace('storage://', '');
      return urls[key] ?? match;
    });
  };

  let draft = $state(content);
  let resolvedContent = $state(content);
  let resolving = $state(hasStorageUrls(content));
  let mode = $state<'write' | 'editor' | 'preview'>('editor');
  let saving = $state(false);
  let uploading = $state(false);

  $effect(() => {
    const md = content;
    if (hasStorageUrls(md)) {
      resolving = true;
      resolveStorageUrls(md).then((resolved) => {
        resolvedContent = resolved;
        draft = resolved;
        resolving = false;
      });
    } else {
      resolvedContent = md;
      draft = md;
      resolving = false;
    }
  });

  const handlePdfUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !onUploadPdf) return;
    uploading = true;
    try {
      await onUploadPdf(file);
    } finally {
      uploading = false;
      input.value = '';
    }
  };

  const isDirty = $derived(draft !== resolvedContent);

  const uploadPendingImages = async (md: string): Promise<string> => {
    if (!onUploadImage) return md;
    const blobRe = /blob:[^\s)]+/g;
    const blobUrls = [...new Set([...md.matchAll(blobRe)].map(m => m[0]))];
    if (!blobUrls.length) return md;

    let result = md;
    for (const blobUrl of blobUrls) {
      const file = pendingImages.get(blobUrl);
      if (!file) continue;
      const storageKey = await onUploadImage(file);
      result = result.replaceAll(blobUrl, `storage://${storageKey}`);
      pendingImages.delete(blobUrl);
      URL.revokeObjectURL(blobUrl);
    }
    return result;
  };

  const handleSave = async () => {
    if (!isDirty) return;
    saving = true;
    try {
      let toSave = draft;
      toSave = await uploadPendingImages(toSave);
      await onSave(toSave);
    } finally {
      saving = false;
    }
  };

  const setMode = async (next: typeof mode) => {
    const leaving = mode === 'write' || mode === 'editor';
    const entering = next === 'preview';
    if (leaving && entering && isDirty) await handleSave();
    mode = next;
  };
</script>

<section class="card doc-card">
  <div class="doc-header">
    {#if editingTitle}
      <input
        class="title-input"
        bind:value={titleDraft}
        onblur={commitTitle}
        onkeydown={handleTitleKeydown}
        use:focusOnMount
        aria-label="Document title"
      />
    {:else}
      <h2 class:editable={!!onSaveTitle} ondblclick={startEditingTitle} title={onSaveTitle ? 'Double-click to rename' : undefined}>{title}</h2>
    {/if}
    {#if hasSourcePdf && onOpenSourcePdf}
      <button type="button" class="badge source-badge" onclick={onOpenSourcePdf}>PDF source</button>
    {/if}
    {#if onClose}
      <button type="button" class="btn icon" onclick={onClose} aria-label="Close">&times;</button>
    {/if}
  </div>
  {#if uploading}
    <div class="status" aria-busy="true">Attaching PDF…</div>
  {:else if resolving}
    <div class="status" aria-busy="true">Loading…</div>
  {:else}
    <div class="doc-editor">
      <div class="tabs">
        <button type="button" class="tab" class:active={mode === 'editor'} onclick={() => setMode('editor')}>Editor</button>
        <button type="button" class="tab" class:active={mode === 'write'} onclick={() => setMode('write')}>Markdown</button>
        <button type="button" class="tab" class:active={mode === 'preview'} onclick={() => setMode('preview')}>Preview</button>
      </div>
      {#if mode === 'write'}
        <div class="toolbar write-actions">
          <span class="spacer"></span>
          {#if onUploadPdf}
            <label class="btn ghost sm">
              Attach PDF
              <input type="file" accept=".pdf,application/pdf" onchange={handlePdfUpload} hidden />
            </label>
          {/if}
          {#if isDirty}<span class="unsaved text-xs">● Unsaved</span>{/if}
          <button type="button" class="btn primary sm" onclick={handleSave} disabled={saving || !isDirty} aria-busy={saving}>Save</button>
        </div>
        <textarea class="doc-textarea mono" bind:value={draft} rows={20} placeholder="Write in markdown..."></textarea>
      {:else if mode === 'editor'}
        {#key resolvedContent}
          <MarkdownEditor value={draft} onChange={(md) => (draft = md)} {pendingImages}>
            {#snippet toolbarEnd()}
              {#if onUploadPdf}
                <label class="btn ghost sm">
                  Attach PDF
                  <input type="file" accept=".pdf,application/pdf" onchange={handlePdfUpload} hidden />
                </label>
              {/if}
              {#if isDirty}<span class="unsaved text-xs">● Unsaved</span>{/if}
              <button type="button" class="btn primary sm" onclick={handleSave} disabled={saving || !isDirty} aria-busy={saving}>Save</button>
            {/snippet}
          </MarkdownEditor>
        {/key}
      {:else}
        <div class="doc-preview">
          <MarkdownRenderer content={draft} />
        </div>
      {/if}
    </div>
  {/if}
</section>

<style lang="scss">
  .doc-card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .doc-header {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    h2 {
      flex: 1;
      min-width: 0;
      margin: 0;
      font-size: var(--fs-base);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      &.editable { cursor: text; }
    }
  }
  .title-input {
    flex: 1;
    height: var(--control-h);
    font-size: var(--fs-base);
    font-weight: 600;
  }
  .source-badge { cursor: pointer; &:hover { color: var(--accent); } }
  .doc-editor {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .write-actions {
    padding: var(--sp-2) 0;
  }
  .doc-textarea {
    width: 100%;
    font-size: var(--fs-sm);
    min-height: 300px;
  }
  .unsaved { color: var(--text-3); white-space: nowrap; }
  .status {
    padding: var(--sp-8);
    text-align: center;
    color: var(--text-3);
    font-size: var(--fs-md);
  }
  .doc-preview {
    padding: var(--sp-3) 0;
    min-height: 200px;
  }
</style>
