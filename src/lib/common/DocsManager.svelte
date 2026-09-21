<script lang="ts">
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';
  import DisclosureButton from '$lib/ui/DisclosureButton.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';

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

  // Closed until asked for: the list is a way in to the docs, not the page's content.
  let expanded = $state(false);

  const toggle = () => { expanded = !expanded; };

  // Adding a doc opens the editor in the centre pane, so show where the new one landed.
  const startAdd = () => {
    expanded = true;
    onStartAdd();
  };

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
    <h4>
      <DisclosureButton {expanded} label="Docs" onToggle={toggle}>
        Docs <span class="count">{docs.length}</span>
      </DisclosureButton>
    </h4>
    <button type="button" class="btn icon sm" onclick={startAdd} title="Add doc" aria-label="Add doc">+</button>
  </div>
  {#if expanded}
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
      <EmptyState message="No docs yet." small />
    {/if}
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
