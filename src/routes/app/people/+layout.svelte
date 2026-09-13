<script lang="ts">
  import { layoutConfig } from '$lib/stores/layout';
  import { onDestroy } from 'svelte';

  layoutConfig.set({ collapseInfoPanel: true });
  onDestroy(() => layoutConfig.set({ collapseInfoPanel: false }));

  const { children } = $props<{ children: any }>();
</script>

{@render children()}
