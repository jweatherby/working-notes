<script lang="ts">
  import { tick } from 'svelte';
  import OrgLevel from './OrgLevel.svelte';
  import SearchPicker from '$lib/ui/SearchPicker.svelte';
  import { pathToPerson, type OrgTreeNode } from '$lib/org/org-tree';

  interface Props {
    readonly roots: readonly OrgTreeNode[];
    readonly groupsByPerson: ReadonlyMap<string, readonly string[]>;
    readonly onEdit: (id: string) => void;
  }

  const { roots, groupsByPerson, onEdit }: Props = $props();

  // Bumping this remounts the chart: back to its default (top lead open), or opened along `focusPath`.
  let resetVersion = $state(0);
  let focusPath = $state<readonly string[]>([]);
  let jumping = $state(false);
  let chartEl = $state<HTMLDivElement | null>(null);

  const people = $derived.by(() => {
    const all: { id: string; name: string }[] = [];
    const walk = (nodes: readonly OrgTreeNode[]) => {
      for (const n of nodes) {
        all.push({ id: n.person.id, name: n.person.name });
        walk(n.children);
      }
    };
    walk(roots);
    return all.sort((a, b) => a.name.localeCompare(b.name));
  });

  const collapseAll = () => {
    focusPath = [];
    resetVersion++;
  };

  const jumpTo = async (id: string) => {
    focusPath = pathToPerson(roots, id);
    jumping = false;
    resetVersion++;
    await tick();
    chartEl
      ?.querySelector(`[data-person-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  };
</script>

<div class="tools">
  {#if jumping}
    <div class="jump">
      <SearchPicker label="Jump to person" options={people} onPick={jumpTo} onCancel={() => { jumping = false; }} />
    </div>
  {:else}
    <button type="button" class="btn link text-sm" onclick={() => { jumping = true; }}>Jump to person</button>
  {/if}
  <button type="button" class="btn link text-sm" onclick={collapseAll}>Collapse all</button>
</div>
<div class="scroller">
  <div class="org-chart" bind:this={chartEl}>
    {#key resetVersion}
      <OrgLevel nodes={roots} {groupsByPerson} {onEdit} {focusPath} isRoot />
    {/key}
  </div>
</div>

<style lang="scss">
  .tools {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-3);
    margin-bottom: var(--sp-2);
  }
  .jump {
    width: 100%;
    max-width: 320px;
  }

  .scroller {
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    padding: var(--sp-2) 0 var(--sp-4);
  }

  // Auto margins centre a narrow chart without clipping a wide one on the left.
  .org-chart {
    width: max-content;
    margin: 0 auto;
  }
</style>
