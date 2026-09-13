<script lang="ts">
  interface Props {
    readonly leftOpen: boolean;
    readonly onToggleLeft: () => void;
    readonly leftLabel?: string;
    readonly sidebar: any;
    readonly children: any;
  }

  const { leftOpen, onToggleLeft, leftLabel = 'Details', sidebar, children }: Props = $props();
</script>

<div class="page-wrap">
  {#if leftOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="backdrop" onclick={onToggleLeft}></div>
  {/if}

  <div class="columns">
    <section class="col col-left" class:drawer-open={leftOpen}>
      <button class="handle handle-left" class:active={leftOpen} onclick={onToggleLeft} title={leftLabel} data-plain>
        <span class="handle-label">{leftLabel}</span>
      </button>
      {@render sidebar()}
    </section>
    <section class="col col-center">
      {@render children()}
    </section>
  </div>
</div>

<style lang="scss">
  .page-wrap { position: relative; padding: 1rem 2rem; }

  .columns {
    display: grid;
    grid-template-columns: 176px minmax(0, 1fr);
    gap: 1rem;
    height: calc(100dvh - 10rem);
  }
  .col {
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    height: 100%;
  }

  .col-left {
    position: relative;
  }

  .handle-left {
    display: none;
    position: absolute;
    top: 50%;
    right: -1.5rem;
    transform: translateY(-50%);
    z-index: 50;
    padding: 0.75rem 0.25rem;
    margin: 0;
    border: 1px solid var(--color-muted-border);
    border-left: none;
    border-radius: 0 4px 4px 0;
    background: var(--color-card-bg, #fff);
    color: var(--color-muted);
    cursor: pointer;
    writing-mode: vertical-rl;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    transition: background 150ms ease, color 150ms ease;

    &:hover, &.active {
      background: var(--color-primary);
      color: #fff;
      border-color: var(--color-primary);
    }
  }
  .handle-label {
    text-transform: uppercase;
    font-weight: 600;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 48;
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(1px);
  }

  @keyframes drawer-in-left {
    from { opacity: 0; transform: translateX(-2rem); }
    to { opacity: 1; transform: translateX(0); }
  }

  @media (max-width: 849px) {
    .columns { display: block; height: auto; }
    .handle-left { display: flex; }

    .col-left {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 49;
      width: 88vw;
      max-width: 400px;
      height: 100vh;
      padding: 1.5rem;
      overflow: visible;
      background: var(--color-card-bg, #fff);
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
      border-right: 1px solid var(--color-muted-border);
      transform: translateX(-100%);
      transition: transform 250ms ease;

      &.drawer-open { transform: translateX(0); }
    }
  }

  @media (max-width: 599px) {
    .page-wrap { padding: 1rem; }
  }
</style>
