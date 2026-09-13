<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    readonly message: string;
    readonly boxed?: boolean;
    readonly children?: Snippet;
  }

  const { message, boxed = false, children }: Props = $props();
</script>

<div class="empty" class:boxed>
  <span>{message}</span>
  {#if children}{@render children()}{/if}
</div>
