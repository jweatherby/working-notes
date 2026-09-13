<script lang="ts">
  import { priorityLabel } from '../utils';

  interface Props {
    readonly priority: number;
  }

  const { priority }: Props = $props();
</script>

{#if priority > 0}
  <span class="priority" data-level={priority}>{priorityLabel(priority)}</span>
{/if}

<style lang="scss">
  .priority {

    font-weight: 700;
    margin-left: 8px;
    &[data-level="1"] {
      color: var(--orange-2);
    }
    &[data-level="2"] {
      color: var(--orange-5);
    }
    &[data-level="3"] {
      color: var(--orange-7);
    }
  }
</style>
