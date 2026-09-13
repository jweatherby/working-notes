<script lang="ts">
  import type { TodoStatus } from '../utils';

  interface Props {
    readonly status: TodoStatus;
    readonly clickable?: boolean;
    readonly onclick?: () => void;
  }

  const { status, clickable = false, onclick }: Props = $props();
</script>

{#if clickable}
  <button class="status-toggle" data-plain title="Advance status" {onclick}>
    <span class="dot" data-status={status}></span>
  </button>
{:else}
  <span class="status-toggle static">
    <span class="dot" data-status={status}></span>
  </span>
{/if}

<style lang="scss">
  .status-toggle {
    all: unset;
    cursor: pointer;
    font-size: 0.85rem;
    width: 1.1rem;
    text-align: center;
    flex-shrink: 0;
    color: var(--color-muted);
    &:hover {
      color: var(--color-primary);
    }
    &.static {
      cursor: default;
      &:hover {
        color: var(--color-muted);
      }
    }
  }
  .dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--color-muted);
    background: transparent;
    vertical-align: middle;
    &[data-status="ACTIVE"] {
      background: var(--orange-3);
      border-color: var(--orange-3);
    }
    &[data-status="COMPLETE"] {
      background: var(--green-7);
      border-color: var(--green-7);
    }
  }
</style>
