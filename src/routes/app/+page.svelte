<script lang="ts">
  import HomeTodos from '$lib/home/components/HomeTodos.svelte';
  import RecentUpdates from '$lib/home/components/RecentUpdates.svelte';
  import RelationGraph from '$lib/home/components/RelationGraph.svelte';
  import type { PageData } from './$types';

  const { data } = $props<{ data: PageData }>();
</script>

<svelte:head><title>Home</title></svelte:head>

<div class="page">
  <div class="home-grid">
    <HomeTodos todos={data.todos} />
    <RecentUpdates updates={data.updates} />
  </div>
  {#if data.graph.nodes.length > 0}
    <RelationGraph graph={data.graph} />
  {/if}
</div>

<style lang="scss">
  .home-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-6);
    align-items: start;
    @include below-md { grid-template-columns: 1fr; }
  }
</style>
