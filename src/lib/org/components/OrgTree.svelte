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
  <button type="button" onclick={() => resetVersion++}>Collapse all</button>
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
    gap: 0.75rem;
    margin-bottom: 0.5rem;

    button {
      @include unstyled-button;
      margin: 0;
      color: var(--color-primary);
      font-size: 0.85rem;
      cursor: pointer;
    }
  }

  .scroller {
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    padding: 0.5rem 0 1rem;
  }

  // Auto margins centre a narrow chart without clipping a wide one on the left.
  .org-chart {
    width: max-content;
    margin: 0 auto;
  }
</style>
