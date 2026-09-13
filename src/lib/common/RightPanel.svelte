<script lang="ts">
  import { rightPanelNotes, activeDrawer } from '$lib/stores/right-panel';
  import NotesList from '$lib/common/NotesList.svelte';

  let drawerOpen = $state(false);

  $effect(() => {
    if ($activeDrawer !== 'right' && drawerOpen) {
      drawerOpen = false;
    }
  });
</script>

{#if drawerOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="drawer-backdrop" onclick={() => { drawerOpen = false; activeDrawer.set(null); }}></div>
{/if}

<aside class="right-panel" class:drawer-open={drawerOpen}>
  <button
    class="handle-right"
    class:active={drawerOpen}
    onclick={() => { drawerOpen = !drawerOpen; activeDrawer.set(drawerOpen ? 'right' : null); }}
    title="Notes"
    data-plain
  >
    <span class="handle-label">Notes</span>
  </button>
  <div class="tab-bar">
    <span class="tab-title">Notes</span>
  </div>

  <div class="tab-content">
    {#if $rightPanelNotes}
      <div class="notes-content">
        {#if $rightPanelNotes.onStartAdd}
          <button class="new-note-cta" onclick={() => $rightPanelNotes?.onStartAdd?.()}>+ New Note</button>
        {/if}
        <NotesList
          notes={$rightPanelNotes.notes}
          onEdit={$rightPanelNotes.onEdit ? (n) => $rightPanelNotes?.onEdit?.(n.id) : undefined}
          onRemove={$rightPanelNotes.onRemove}
        />
      </div>
    {:else}
      <div class="placeholder-content">
        <p>Open a person, team, department or project to see its notes.</p>
      </div>
    {/if}
  </div>
</aside>

<style lang="scss">
  .handle-right {
    display: none;
    position: absolute;
    top: 50%;
    left: -1.5rem;
    transform: translateY(-50%);
    z-index: 50;
    padding: 0.75rem 0.25rem;
    margin: 0;
    border: 1px solid var(--color-muted-border);
    border-right: none;
    border-radius: 4px 0 0 4px;
    overflow: visible;
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

  .drawer-backdrop {
    display: none;
  }

  .right-panel {
    grid-row: span 2;
    position: fixed;
    top: 0;
    right: 0;
    width: 280px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--color-muted-border);
    overflow: visible;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--color-muted-border);
    flex-shrink: 0;
  }

  .tab-title {
    flex: 1;
    padding: 0.5rem 0.25rem;
    border-bottom: 2px solid var(--color-primary);
    color: var(--color-primary);
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .placeholder-content {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 6rem;
    p {
      font-size: 0.85rem;
      color: var(--color-muted);
      text-align: center;
    }
  }

  .notes-content {
    .new-note-cta {
      width: 100%;
      margin: 0 0 1rem;
    }
  }

  @media (max-width: 768px) {
    .handle-right { display: flex; }
    .drawer-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 49;
      background: rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(1px);
    }
    .right-panel {
      width: min(320px, 85vw);
      z-index: 50;
      background: var(--color-card-bg, #fff);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: transform 250ms ease;

      &.drawer-open {
        transform: translateX(0);
      }
    }
  }
</style>
