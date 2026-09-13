<script lang="ts">
  import MarkdownEditor from '$lib/common/MarkdownEditor.svelte';

  interface Props {
    readonly noteId: string;
    readonly content: string;
    readonly onSave: (content: string) => Promise<void>;
    readonly onClose?: () => void;
  }

  const { noteId, content, onSave, onClose }: Props = $props();

  let draft = $state(content);
  let saving = $state(false);
  let lastSavedId = $state(noteId);

  $effect(() => {
    if (noteId !== lastSavedId) {
      draft = content;
      lastSavedId = noteId;
    }
  });

  const handleSave = async () => {
    if (!draft.trim() || draft === content) return;
    saving = true;
    try {
      await onSave(draft);
    } finally {
      saving = false;
    }
  };
</script>

<div class="note-editor">
  <div class="note-header">
    <h3>Note</h3>
    {#if onClose}
      <button class="close-btn" data-plain onclick={onClose} aria-label="Close"></button>
    {/if}
  </div>
  <MarkdownEditor value={draft} onChange={(md) => draft = md} />
  <div class="actions">
    <button
      onclick={handleSave}
      disabled={saving || !draft.trim() || draft === content}
      aria-busy={saving}
    >Save</button>
  </div>
</div>

<style lang="scss">
  .note-editor {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
  }
  .actions button {
    margin: 0;
  }
  .note-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    h3 { flex: 1; min-width: 0; margin: 0; }
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
</style>
