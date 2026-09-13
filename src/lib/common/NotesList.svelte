<script lang="ts">
  import { marked } from 'marked';

  interface Note {
    readonly id: string;
    readonly content: string;
    readonly createdAt: Date | string;
  }

  interface Props {
    readonly notes: readonly Note[];
    readonly maxHeight?: number;
    readonly onEdit?: (note: Note) => void;
    readonly onRemove?: (id: string) => void;
  }

  const { notes, maxHeight = 250, onEdit, onRemove }: Props = $props();

  const sortedNotes = $derived([...notes].sort((a, b) => {
    const da = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
    const db = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
    return db.getTime() - da.getTime();
  }));

  let expandedNotes = $state(new Set<string>());
  let overflowingNotes = $state(new Set<string>());
  let listEl: HTMLDivElement;

  const expandNote = (id: string) => {
    expandedNotes = new Set(expandedNotes).add(id);
  };

  const collapseNote = (id: string) => {
    const next = new Set(expandedNotes);
    next.delete(id);
    expandedNotes = next;
  };

  const recheckOverflows = () => {
    if (!listEl) return;
    const next = new Set<string>();
    for (const el of listEl.querySelectorAll<HTMLDivElement>('[data-note-body]')) {
      const id = el.dataset.noteBody!;
      if (el.scrollHeight > el.clientHeight) next.add(id);
    }
    overflowingNotes = next;
  };

  $effect(() => {
    notes;
    requestAnimationFrame(() => requestAnimationFrame(recheckOverflows));
  });

  const formatDate = (d: Date | string) => {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('en-CA');
  };
</script>

{#if notes.length > 0}
  <div class="notes-list" bind:this={listEl}>
    {#each sortedNotes as note (note.id)}
      <article class="note">
        <header>
          {#if onEdit}
            <button data-plain onclick={() => onEdit(note)} title="Edit" class="note-meta">{formatDate(note.createdAt)}</button>
          {:else}
            <span class="note-meta">{formatDate(note.createdAt)}</span>
          {/if}
          <span class="note-actions">
            {#if onRemove}
              <button class="note-action-btn" data-plain onclick={() => { if (confirm('Delete this note?')) onRemove(note.id); }} title="Delete">&times;</button>
            {/if}
          </span>
        </header>
        <div
          class="note-body"
          class:clamped={!expandedNotes.has(note.id)}
          data-note-body={note.id}
          style="--max-height: {maxHeight}px"
        >
          {@html marked.parse(note.content)}
        </div>
        {#if !expandedNotes.has(note.id) && overflowingNotes.has(note.id)}
          <button class="toggle-btn" data-plain onclick={() => expandNote(note.id)}>see more</button>
        {:else if expandedNotes.has(note.id)}
          <button class="toggle-btn" data-plain onclick={() => collapseNote(note.id)}>show less</button>
        {/if}
      </article>
    {/each}
  </div>
{:else}
  <p class="muted">No notes yet.</p>
{/if}

<style lang="scss">
  .notes-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .note {
    margin: 0;
    padding: 0.75rem;
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }
  }
  .note-meta {
    font-size: 0.8rem;
    color: var(--color-muted);
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    &:hover { color: var(--color-primary); }
  }
  .note-actions {
    display: flex;
    gap: 0.25rem;
  }
  .note-action-btn {
    padding: 0 0.4rem;
    margin: 0;
    font-size: 1rem;
    line-height: 1;
    border: none;
    background: none;
    color: var(--color-muted);
    cursor: pointer;
    &:hover { color: var(--color-danger); }
  }
  .note-body {
    font-size: $font-xs;
    :global(p:last-child) { margin-bottom: 0; }
    &.clamped {
      max-height: var(--max-height, 250px);
      overflow: hidden;
    }
  }
  .toggle-btn {
    font-size: 0.75rem;
    color: var(--color-primary);
    padding: 0;
    margin: 0.25rem 0 0;
    border: none;
    background: none;
    cursor: pointer;
    &:hover { text-decoration: underline; }
  }
  .muted {
    font-size: $font-md;
    color: var(--color-muted);
  }
</style>
