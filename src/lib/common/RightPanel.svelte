<script lang="ts">
  import { rightPanelNotes, rightPanelPage, rightPanelTab, activeDrawer } from '$lib/stores/right-panel';
  import NotesList from '$lib/common/NotesList.svelte';
  import PageChat from '$lib/common/PageChat.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';

  let drawerOpen = $state(false);

  $effect(() => {
    if ($activeDrawer !== 'right' && drawerOpen) {
      drawerOpen = false;
    }
  });

  const closeDrawer = () => { drawerOpen = false; activeDrawer.set(null); };
  const toggleDrawer = () => { drawerOpen = !drawerOpen; activeDrawer.set(drawerOpen ? 'right' : null); };
</script>

<!-- Outside the panel: its transform would make a fixed backdrop cover the panel itself. -->
{#if drawerOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="drawer-backdrop notes-backdrop" onclick={closeDrawer}></div>
{/if}
<aside class="right-panel" class:drawer-open={drawerOpen}>
  <button type="button" class="drawer-handle" data-side="right" class:active={drawerOpen} onclick={toggleDrawer} title="Notes and chat">
    {$rightPanelTab === 'chat' ? 'Chat' : 'Notes'}
  </button>

  <div class="panel-header">
    <div class="tabs" role="tablist">
      <button type="button" role="tab" class="tab" class:active={$rightPanelTab === 'notes'} aria-selected={$rightPanelTab === 'notes'} onclick={() => rightPanelTab.set('notes')}>
        Notes{#if $rightPanelNotes} <span class="count">{$rightPanelNotes.notes.length}</span>{/if}
      </button>
      <button type="button" role="tab" class="tab" class:active={$rightPanelTab === 'chat'} aria-selected={$rightPanelTab === 'chat'} onclick={() => rightPanelTab.set('chat')}>
        Chat
      </button>
    </div>
    {#if $rightPanelTab === 'notes' && $rightPanelNotes?.onStartAdd}
      <button type="button" class="btn ghost sm" onclick={() => $rightPanelNotes?.onStartAdd?.()}>+ Note</button>
    {/if}
  </div>

  <div class="panel-body" hidden={$rightPanelTab !== 'notes'}>
    {#if $rightPanelNotes}
      <NotesList
        notes={$rightPanelNotes.notes}
        onEdit={$rightPanelNotes.onEdit ? (n) => $rightPanelNotes?.onEdit?.(n.id) : undefined}
        onRemove={$rightPanelNotes.onRemove}
      />
    {:else}
      <div class="panel-empty"><EmptyState message="Open a person, team, department or project to see its notes." /></div>
    {/if}
  </div>

  <!-- Hidden, not unmounted, so switching tabs keeps the conversation. A new page starts a new one. -->
  <div class="panel-chat" hidden={$rightPanelTab !== 'chat'}>
    {#if $rightPanelPage}
      {#key $rightPanelPage.entityId}
        <PageChat page={$rightPanelPage} />
      {/key}
    {:else}
      <div class="panel-empty"><EmptyState message="Open a person, team, project, goal or page to chat about it." /></div>
    {/if}
  </div>
</aside>

<style lang="scss">
  .right-panel {
    grid-row: span 2;
    position: fixed;
    top: 0;
    right: 0;
    width: var(--panel-w);
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-left: 1px solid var(--border);
    overflow: visible;
  }
  .drawer-backdrop { display: none; }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    height: var(--nav-h);
    padding: 0 var(--sp-3) 0 var(--sp-4);
    border-bottom: 1px solid var(--border);
    .tabs { align-self: stretch; align-items: flex-end; border-bottom: none; }
    .count { font-weight: 400; margin-left: 2px; }
  }
  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--sp-3) var(--sp-4);
  }
  .panel-chat {
    flex: 1;
    min-height: 0;
  }
  .panel-empty { padding-top: var(--sp-4); text-align: center; }

  @include below-md {
    .drawer-handle { display: flex; }
    .drawer-backdrop { display: block; }
    .right-panel {
      // Below the top bar, which would otherwise cover the panel header.
      top: var(--nav-h);
      height: calc(100dvh - var(--nav-h));
      width: min(520px, 92vw);
      z-index: var(--z-drawer);
      box-shadow: var(--shadow-3);
      transform: translateX(100%);
      transition: transform 250ms ease;
      &.drawer-open { transform: translateX(0); }
    }
  }
</style>
