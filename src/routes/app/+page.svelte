<script lang="ts">
  import CenteredLayout from '$lib/common/CenteredLayout.svelte';
  import HomeTodos from '$lib/home/components/HomeTodos.svelte';
  import RecentUpdates from '$lib/home/components/RecentUpdates.svelte';
  import RelationGraph from '$lib/home/components/RelationGraph.svelte';
  import type { PageData } from './$types';

  const { data } = $props<{ data: PageData }>();
</script>

<svelte:head><title>Home</title></svelte:head>

<CenteredLayout>
  <div class="home-grid">
    <HomeTodos todos={data.todos} />
    <RecentUpdates updates={data.updates} />
  </div>
  {#if data.graph.nodes.length > 0}
    <RelationGraph graph={data.graph} />
  {/if}
</CenteredLayout>

<style lang="scss">
  .home-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
  }
  @media (max-width: 768px) {
    .home-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
