<script lang="ts">
  import MarkdownEditor from "$lib/common/MarkdownEditor.svelte";
  import MarkdownRenderer from "$lib/common/MarkdownRenderer.svelte";

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
  let mode = $state<"write" | "editor" | "preview">("editor");
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
      input.value = "";
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

  const revertResolvedUrls = (md: string, originalContent: string): string => {
    if (!onResolveImages) return md;
    const originalKeys = [...originalContent.matchAll(STORAGE_RE)].map(m => m[0]);
    if (!originalKeys.length) return md;
    const resolvedMatches = [...resolvedContent.matchAll(STORAGE_RE)];
    const originalMatches = [...content.matchAll(STORAGE_RE)];
    let result = md;
    for (let i = 0; i < resolvedMatches.length && i < originalMatches.length; i++) {
      const resolvedUrl = resolvedMatches[i]![0];
      const originalUrl = originalMatches[i]![0];
      if (resolvedUrl !== originalUrl) {
        result = result.replaceAll(resolvedUrl, originalUrl);
      }
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
    const leaving = mode === "write" || mode === "editor";
    const entering = next === "preview";
    if (leaving && entering && isDirty) await handleSave();
    mode = next;
  };
</script>

<div class="doc-header">
  {#if editingTitle}
    <input
      class="title-input"
      bind:value={titleDraft}
      onblur={commitTitle}
      onkeydown={handleTitleKeydown}
      autofocus
    />
  {:else}
    <h3
      class:editable={!!onSaveTitle}
      ondblclick={startEditingTitle}
    >{title}</h3>
  {/if}
  {#if hasSourcePdf && onOpenSourcePdf}
    <button class="source-badge" data-plain onclick={onOpenSourcePdf}>PDF source</button>
  {/if}
  {#if onClose}
    <button class="close-btn" data-plain onclick={onClose} aria-label="Close"></button>
  {/if}
</div>
{#if uploading}
  <div class="upload-status" aria-busy="true">Attaching PDF…</div>
{:else if resolving}
  <div class="upload-status" aria-busy="true">Loading…</div>
{:else}
  <div class="doc-editor">
    <div class="editor-tabs">
      <button
        class="tab"
        class:active={mode === "editor"}
        onclick={() => setMode("editor")}
        data-plain>Editor</button
      >
      <button
        class="tab"
        class:active={mode === "write"}
        onclick={() => setMode("write")}
        data-plain>Markdown</button
      >
      <button
        class="tab"
        class:active={mode === "preview"}
        onclick={() => setMode("preview")}
        data-plain>Preview</button
      >
    </div>
    {#if mode === "write"}
      <div class="write-actions">
        {#if onUploadPdf}
          <label class="pdf-upload-btn">
            Attach PDF
            <input type="file" accept=".pdf,application/pdf" onchange={handlePdfUpload} hidden />
          </label>
        {/if}
        {#if isDirty}
          <span class="unsaved-tag">● Unsaved</span>
        {/if}
        <button class="save-btn" onclick={handleSave} disabled={saving} aria-busy={saving}>Save</button>
      </div>
      <textarea
        class="doc-textarea"
        bind:value={draft}
        rows={20}
        placeholder="Write in markdown..."
      ></textarea>
    {:else if mode === "editor"}
      {#key resolvedContent}
        <MarkdownEditor value={draft} onChange={(md) => (draft = md)} {pendingImages}>
          {#snippet toolbarEnd()}
            {#if onUploadPdf}
              <label class="pdf-upload-btn">
                Attach PDF
                <input type="file" accept=".pdf,application/pdf" onchange={handlePdfUpload} hidden />
              </label>
            {/if}
            {#if isDirty}
              <span class="unsaved-tag">● Unsaved</span>
            {/if}
            <button class="save-btn" onclick={handleSave} disabled={saving} aria-busy={saving}>Save</button>
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

<style lang="scss">
  .doc-editor {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .editor-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 0;
    border-bottom: 1px solid var(--color-muted-border);
    button:hover {
      color: var(--color-primary);
    }
  }
  .tab {
    padding: 0.4rem 1rem;
    margin: 0;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--color-muted);
    font-size: 0.85rem;
    cursor: pointer;
    border-radius: 0;

    &.active {
      color: var(--color-primary);
    }
    &:hover:not(.active) {
      color: var(--color-secondary);
      border-color: var(--color-primary);
    }
    &:hover {
      border-bottom-color: var(--color-primary);
    }
  }
  .doc-textarea {
    width: 100%;
    font-family: monospace;
    font-size: 0.85rem;
    min-height: 300px;
    resize: vertical;
  }
  h3 {
    margin-bottom: 0.25rem;
    &.editable {
      cursor: pointer;
      border-bottom: 1px dashed transparent;
      &:hover {
        border-bottom-color: var(--color-muted-border);
      }
    }
  }
  .title-input {
    font-size: inherit;
    font-weight: bold;
    font-family: inherit;
    border: none;
    border-bottom: 1px solid var(--color-primary);
    background: transparent;
    outline: none;
    padding: 0;
    margin-bottom: 0.25rem;
    width: 100%;
  }
  .write-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid var(--color-muted-border);
    background: var(--color-card-bg);
  }

  .save-btn {
    padding: 0.2rem 0.75rem;
    margin: 0;
    font-size: 0.8rem;
  }
  .unsaved-tag {
    color: var(--color-muted);
    font-size: 0.75rem;
    white-space: nowrap;
  }
  .doc-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    h3 { flex: 1; min-width: 0; }
  }
  .close-btn {
    padding: 0.25rem 0.5rem;
    margin: 0;
    border: none;
    background: none;
    color: var(--color-muted);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
    &:hover { color: var(--color-text); }
  }
  .source-badge {
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    border-radius: var(--radius, 4px);
    background: var(--color-surface-alt, #f0f0f0);
    color: var(--color-muted);
    text-decoration: none;
    white-space: nowrap;
    &:hover {
      color: var(--color-primary);
    }
  }
  .upload-status {
    padding: 2rem;
    text-align: center;
    color: var(--color-muted);
    font-size: 0.9rem;
  }
  .pdf-upload-btn {
    cursor: pointer;
    padding: 0.2rem 0.75rem;
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-muted);
    &:hover {
      color: var(--color-primary);
    }
  }
  .doc-preview {
    padding: 1rem 0;
    min-height: 300px;
  }
</style>
