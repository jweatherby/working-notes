<script lang="ts">
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';

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
  <div class="section-header">
    <h4>Docs <span class="count">{docs.length}</span></h4>
    <button type="button" class="btn icon sm" onclick={onStartAdd} title="Add doc" aria-label="Add doc">+</button>
  </div>
  {#if docs.length > 0}
    <ul class="list">
      {#each docs as doc, i (doc.id)}
        <li class="list-row" class:active={activeDocId === doc.id}>
          <button type="button" class="grow truncate doc-title" onclick={() => onSelect(doc.id)}>
            {doc.title}
          </button>
          <span class="row-actions">
            <button type="button" class="btn icon sm" onclick={() => moveUp(i)} disabled={i === 0} title="Move up" aria-label="Move up">↑</button>
            <button type="button" class="btn icon sm" onclick={() => moveDown(i)} disabled={i === docs.length - 1} title="Move down" aria-label="Move down">↓</button>
            <ConfirmButton label="Delete doc" variant="icon" onConfirm={() => onRemove(doc.id)} />
          </span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty text-sm">No docs yet.</p>
  {/if}
</div>

<style lang="scss">
  .doc-title {
    text-align: left;
    padding: 4px 0;
    &:hover { color: var(--accent); }
  }
  .list-row.active .doc-title { color: var(--accent); font-weight: 500; }
  .row-actions :global(.btn.icon.sm) { font-size: var(--fs-sm); }
</style>
