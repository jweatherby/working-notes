<script lang="ts">
  import { untrack } from 'svelte';
  import Self from './OrgLevel.svelte';
  import { countDescendants, type OrgTreeNode } from '$lib/org/org-tree';

  interface Props {
    // One row of peers: the roots, or the reports of the lead opened in the row above.
    readonly nodes: readonly OrgTreeNode[];
    readonly groupsByPerson: ReadonlyMap<string, readonly string[]>;
    readonly onEdit: (id: string) => void;
    readonly parentGroups?: readonly string[];
    readonly isRoot?: boolean;
  }

  const { nodes, groupsByPerson, onEdit, parentGroups = [], isRoot = false }: Props = $props();

  // Big teams wrap into a boxed grid so the chart doesn't grow endlessly sideways.
  const WRAP_AFTER = 4;
  const wrap = $derived(nodes.length > WRAP_AFTER);

  // At most one peer is open per row; its reports render as the next row, below all peers.
  // The top row starts with its first lead open.
  let openId = $state<string | null>(
    untrack(() => (isRoot ? (nodes.find((n) => n.children.length > 0)?.person.id ?? null) : null))
  );
  const openNode = $derived(nodes.find((n) => n.person.id === openId && n.children.length > 0) ?? null);

  const toggle = (id: string): void => {
    openId = openId === id ? null : id;
  };

  // Only show tags the lead doesn't already show.
  const visibleGroups = (id: string): readonly string[] =>
    (groupsByPerson.get(id) ?? []).filter((g) => !parentGroups.includes(g));
</script>

<div class="level" class:root={isRoot}>
  <ul class:wrap style:--cols={WRAP_AFTER}>
    {#each nodes as node (node.person.id)}
      {@const open = openNode?.person.id === node.person.id}
      <li>
        <div class="card" class:open>
          <a class="name" href="/app/people/{node.person.id}">{node.person.name}</a>
          {#if node.person.title}<span class="title">{node.person.title}</span>{/if}
          {#if visibleGroups(node.person.id).length > 0}
            <span class="chips">
              {#each visibleGroups(node.person.id) as g}<span class="chip">{g}</span>{/each}
            </span>
          {/if}
          <button type="button" class="edit" aria-label="Edit {node.person.name}" onclick={() => onEdit(node.person.id)}
            >Edit</button
          >
        </div>
        {#if node.children.length > 0}
          <button type="button" class="count" class:open aria-expanded={open} onclick={() => toggle(node.person.id)}>
            {node.children.length}{countDescendants(node) > node.children.length ? ` · ${countDescendants(node)}` : ''}
            {open ? '▴' : '▾'}
          </button>
        {/if}
      </li>
    {/each}
  </ul>

  {#if openNode}
    <div class="next">
      <span class="next-label">{openNode.person.name}'s reports</span>
      {#key openNode.person.id}
        <Self nodes={openNode.children} {groupsByPerson} {onEdit} parentGroups={groupsByPerson.get(openNode.person.id) ?? []} />
      {/key}
    </div>
  {/if}
</div>

<style lang="scss">
  $gap: 1.25rem;
  $line: 1px solid var(--color-muted-border);

  .level {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    padding-top: $gap;

    // Line down into this row from the row above.
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      height: $gap;
      border-left: $line;
    }

    &.root {
      padding-top: 0;
      &::before {
        display: none;
      }
    }
  }

  ul {
    display: flex;
    justify-content: center;
    margin: 0;
    padding: 0;
  }

  li {
    list-style: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    padding: $gap 0.35rem 0;

    // Bar across the row plus a drop into each card.
    &::before,
    &::after {
      content: '';
      position: absolute;
      top: 0;
      width: 50%;
      height: $gap;
      border-top: $line;
    }
    &::before {
      right: 50%;
    }
    &::after {
      left: 50%;
      border-left: $line;
    }
    &:first-child::before,
    &:last-child::after,
    &:only-child::after {
      border-top: none;
    }
    &:last-child::before {
      border-right: $line;
    }
    &:last-child:not(:only-child)::after {
      border-left: none;
    }
  }

  .root > ul > li {
    padding-top: 0;
    &::before,
    &::after {
      display: none;
    }
  }

  // Wrapped team: a light box, cards in even rows, no per-card connectors.
  ul.wrap {
    display: grid;
    grid-template-columns: repeat(var(--cols), 8.5rem);
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.75rem;
    border: $line;
    border-radius: var(--radius, 8px);

    > li {
      padding: 0;
      align-items: stretch;
      &::before,
      &::after {
        display: none;
      }
    }

    .card {
      min-width: 0;
      max-width: none;
      height: 100%;
    }
  }

  .card {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    min-width: 8rem;
    max-width: 11rem;
    padding: 0.5rem 0.65rem;
    border: $line;
    border-radius: var(--radius, 8px);
    background: var(--color-card-bg);
    text-align: center;

    &.open {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 1px var(--color-primary);
    }

    &:hover .edit,
    &:focus-within .edit {
      opacity: 1;
    }
  }

  .name {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .title {
    color: var(--color-muted);
    font-size: 0.8rem;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.2rem;
  }

  .chip {
    font-size: 0.65rem;
    padding: 0 0.35rem;
    border: $line;
    border-radius: 999px;
    color: var(--color-muted);
  }

  // Edit stays off the card face until hover or keyboard focus.
  .edit {
    @include unstyled-button;
    position: absolute;
    top: 0.2rem;
    right: 0.35rem;
    margin: 0;
    opacity: 0;
    color: var(--color-primary);
    font-size: 0.7rem;
    cursor: pointer;
  }

  // Reports badge: direct reports · everyone below, when different.
  .count {
    @include unstyled-button;
    position: relative;
    z-index: 1;
    align-self: center;
    margin: -0.55rem 0 0;
    padding: 0 0.45rem;
    border: $line;
    border-radius: 999px;
    background: var(--color-card-bg);
    color: var(--color-muted);
    font-size: 0.7rem;
    line-height: 1.1rem;
    cursor: pointer;

    &:hover,
    &.open {
      color: var(--color-primary);
      border-color: var(--color-primary);
    }
  }

  .next {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: $gap;
    padding-top: 0;
  }

  .next-label {
    color: var(--color-muted);
    font-size: 0.75rem;
  }
</style>
