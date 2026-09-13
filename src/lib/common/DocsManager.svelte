<script lang="ts">
  interface Doc {
    readonly id: string;
    readonly title: string;
    readonly sortOrder: number;
  }

  interface Props {
    readonly docs: readonly Doc[];
    readonly activeDocId: string | null;
    readonly onSelect: (id: string) => void;
    readonly onStartAdd: () => void;
    readonly onRemove: (id: string) => Promise<void>;
    readonly onReorder: (docIds: readonly string[]) => Promise<void>;
  }

  const {
    docs,
    activeDocId,
    onSelect,
    onStartAdd,
    onRemove,
    onReorder,
  }: Props = $props();

  const moveUp = async (index: number) => {
    if (index <= 0) return;
    const ids = docs.map((d) => d.id);
    [ids[index - 1], ids[index]] = [ids[index]!, ids[index - 1]!];
    await onReorder(ids);
  };

  const moveDown = async (index: number) => {
    if (index >= docs.length - 1) return;
    const ids = docs.map((d) => d.id);
    [ids[index], ids[index + 1]] = [ids[index + 1]!, ids[index]!];
    await onReorder(ids);
  };
</script>

<div class="docs-manager">
  <div class="docs-header">
    <h4>Docs</h4>
    <button
      class="add-btn"
      data-plain
      onclick={onStartAdd}
      title="Add doc"
      aria-label="Add doc"
    >+</button>
  </div>
  {#if docs.length > 0}
    <ul class="doc-list">
      {#each docs as doc, i}
        <li class:active={activeDocId === doc.id}>
          <div class="arrow-btns">
            <button class="arrow-btn" type="button" onclick={() => moveUp(i)} disabled={i === 0} title="Move up">&#9650;</button>
            <button class="arrow-btn" type="button" onclick={() => moveDown(i)} disabled={i === docs.length - 1} title="Move down">&#9660;</button>
          </div>
          <button class="doc-title btn-sm outline" data-plain onclick={() => onSelect(doc.id)}>
            {doc.title}
          </button>
          <button
            class="remove-btn"
            data-plain
            onclick={() => {
              if (confirm("Delete this doc?")) onRemove(doc.id);
            }}>&times;</button
          >
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">No docs yet.</p>
  {/if}
</div>

<style lang="scss">
  h4 {
    margin: 0;
  }
  .docs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .add-btn {
    all: unset;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0 0.35rem;
    color: var(--color-muted);
    &:hover { color: var(--color-primary); }
    &:disabled { opacity: 0.4; cursor: default; }
  }

  .doc-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.75rem;
    li {
      display: flex;
      align-items: center;
      padding: 0.3rem 0.5rem;
      border-radius: 4px;
      gap: 0.35rem;
      
      &.active {
        background: var(--gray-1);
      }
    }
  }
  .doc-title {
    flex: 1;
    text-align: left;
  }
  .arrow-btns {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .arrow-btn {
    all: unset;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;
    padding: 0 0.15rem;
    color: var(--color-secondary);
    &:hover:not(:disabled) {
      color: var(--color-primary);
    }
    &:disabled {
      opacity: 0.25;
      cursor: default;
      color: var(--color-muted);
    }
  }
  .remove-btn {
    all: unset;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--color-danger);
    &:hover {
      text-decoration: underline;
    }
  }

  .muted {
    font-size: 0.85rem;
    color: var(--color-muted);
  }
</style>
