<script lang="ts">
  // A panel that slides in from the right to show an entity without leaving the
  // page. Open while `?<param>` is set; see peek-url.ts.
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { closePeek, PEEK_PARAM } from './peek-url';

  interface Props {
    readonly title: string;
    /** The entity's full page, for the Open link. */
    readonly href: string;
    readonly param?: string;
    readonly children: Snippet;
  }

  const { title, href, param = PEEK_PARAM, children }: Props = $props();

  const isOpen = $derived(page.url.searchParams.has(param));
  const titleId = $props.id();

  const close = () => closePeek(param);

  const handleKeydown = (e: KeyboardEvent) => {
    // Leave Escape to a popup opened from inside the peek (a todo).
    if (isOpen && e.key === 'Escape' && !page.url.searchParams.has('popup')) close();
  };

  // Focus the panel on open, and give focus back to whatever opened it on close.
  const focusPanel = (node: HTMLElement) => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node.focus();
    return { destroy: () => { if (opener?.isConnected) opener.focus(); } };
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Escape closes it too (handleKeydown). -->
  <div class="drawer-backdrop" role="presentation" onclick={close}></div>
  <div class="side-peek" role="dialog" aria-modal="true" aria-labelledby={titleId} tabindex="-1" use:focusPanel>
    <header class="peek-header">
      <h2 id={titleId} class="truncate">{title}</h2>
      <a class="btn ghost sm" {href}>Open</a>
      <button type="button" class="btn icon" aria-label="Close" onclick={close}>&times;</button>
    </header>
    <div class="peek-body">
      {@render children()}
    </div>
  </div>
{/if}

<style lang="scss">
  .side-peek {
    // Full height and over the top nav, which scrolls with the page; under popups (a todo opened from it).
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: calc(var(--z-nav) + 1);
    width: min(560px, 92vw);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-left: 1px solid var(--border);
    box-shadow: var(--shadow-3);
    animation: peek-in 200ms ease;
    &:focus { outline: none; }
  }

  .peek-header {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-shrink: 0;
    height: var(--nav-h);
    padding: 0 var(--sp-3) 0 var(--sp-5);
    border-bottom: 1px solid var(--border);
    h2 { flex: 1; min-width: 0; margin: 0; font-size: var(--fs-lg); }
  }
  .peek-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--sp-4) var(--sp-5) var(--sp-6);
  }

  @keyframes peek-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .side-peek { animation: none; }
  }

  @include mobile {
    .side-peek { width: 100vw; }
  }
</style>
