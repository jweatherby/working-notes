<script lang="ts">
  import OrgLevel from './OrgLevel.svelte';
  import type { OrgTreeNode } from '$lib/org/org-tree';

  interface Props {
    readonly roots: readonly OrgTreeNode[];
    readonly groupsByPerson: ReadonlyMap<string, readonly string[]>;
    readonly onEdit: (id: string) => void;
  }

  const { roots, groupsByPerson, onEdit }: Props = $props();

  // Bumping this remounts the chart, back to its default (top lead open).
  let resetVersion = $state(0);
</script>

<div class="tools">
  <button type="button" class="btn link text-sm" onclick={() => resetVersion++}>Collapse all</button>
</div>
<div class="scroller">
  <div class="org-chart">
    {#key resetVersion}
      <OrgLevel nodes={roots} {groupsByPerson} {onEdit} isRoot />
    {/key}
  </div>
</div>

<style lang="scss">
  .tools {
    display: flex;
    gap: var(--sp-3);
    margin-bottom: var(--sp-2);
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
