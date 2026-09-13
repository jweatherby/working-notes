<script lang="ts">
  import RightPanel from '$lib/common/RightPanel.svelte';

  interface Props {
    readonly children: any;
    readonly showInfoPanel?: boolean;
    readonly collapseInfoPanelOnMedium?: boolean;
    readonly brandIconUrl?: string | null;
  }

  const { children, showInfoPanel = false, collapseInfoPanelOnMedium = false, brandIconUrl = null }: Props = $props();

  let menuOpen = $state(false);
</script>

<div class="app-layout" class:has-panel={showInfoPanel} class:collapse-medium={collapseInfoPanelOnMedium}>
  {#if showInfoPanel}
    <RightPanel />
  {/if}
  <div>
    <nav>
      <div class="nav-bar">
        <a href="/" class="nav-brand">
          {#if brandIconUrl}
            <img src={brandIconUrl} alt="" class="brand-icon" />
          {/if}
          <strong>Working Notes</strong>
        </a>
        <button class="hamburger" class:active={menuOpen} onclick={() => { menuOpen = !menuOpen; }} data-plain aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
      <ul class="nav-links" class:open={menuOpen}>
        <li><a href="/app" onclick={() => { menuOpen = false; }}>Home</a></li>
        <li><a href="/app/projects" onclick={() => { menuOpen = false; }}>Projects</a></li>
        <li><a href="/app/orgmap" onclick={() => { menuOpen = false; }}>Org Map</a></li>
        <li><a href="/app/todos" onclick={() => { menuOpen = false; }}>Todos</a></li>
        <li><a href="/app/reports" onclick={() => { menuOpen = false; }}>Reports</a></li>
        <li><a href="/app/branding" onclick={() => { menuOpen = false; }}>Branding</a></li>
      </ul>
    </nav>
    <main>
      {@render children()}
    </main>
    <footer class="site-footer">
      <p class="credit">
        By <a href="https://jweatherby.dev" target="_blank" rel="noopener">jweatherby.dev</a>.
      </p>
    </footer>
  </div>
</div>

<style lang="scss">
  nav {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-muted-border);
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  .nav-bar {
    display: flex;
    align-items: center;
  }
  .nav-brand {
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  .brand-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    display: block;
  }
  .nav-links {
    display: flex;
    gap: 1.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
    align-items: center;
    flex: 1;

    li:last-child { margin-left: auto; }
  }
  .nav-btn {
    padding: 0.3rem 0.75rem;
    margin: 0;
    border: none;
    cursor: pointer;
  }
  .hamburger {
    display: none;
    flex-direction: column;
    gap: 4px;
    padding: 0.5rem;
    margin: 0;
    border: none;
    background: none;
    cursor: pointer;

    span {
      display: block;
      width: 20px;
      height: 2px;
      background: var(--color-text);
      border-radius: 1px;
      transition: transform 200ms ease, opacity 200ms ease;
    }

    &.active span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
    &.active span:nth-child(2) { opacity: 0; }
    &.active span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
  }

  @media (max-width: 768px) {
    nav { position: relative; }
    .nav-bar { flex: 1; justify-content: space-between; }
    .hamburger { display: flex; }
    .nav-links {
      display: none;
      flex-direction: column;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 100;
      background: var(--color-card-bg, #1a1a2e);
      border-bottom: 1px solid var(--color-muted-border);
      padding: 0.5rem 1rem;
      gap: 0;

      &.open { display: flex; }

      li { width: 100%; }
      li:last-child { margin-left: 0; }
      li a, li form button {
        display: block;
        padding: 0.5rem 0;
        width: 100%;
        text-align: left;
      }
    }
  }
  .app-layout {
    display: grid;
    // minmax(0, 1fr) so wide content scrolls inside the page instead of pushing the panel off-screen.
    grid-template-columns: minmax(0, 1fr);
    min-height: 100dvh;

    &.has-panel {
      grid-template-columns: minmax(0, 1fr) 280px;
    }

    > div {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 100dvh;
    }
  }
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  @media (min-width: 769px) and (max-width: 1149px) {
    .app-layout.has-panel.collapse-medium {
      grid-template-columns: minmax(0, 1fr);
      :global(.drawer-backdrop) {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 49;
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(1px);
      }
      :global(.handle-right) { display: flex; }
      :global(.right-panel) {
        width: min(320px, 85vw);
        z-index: 50;
        background: var(--color-card-bg, #fff);
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 250ms ease;
      }
      :global(.right-panel.drawer-open) {
        transform: translateX(0);
      }
    }
  }

  @media (max-width: 768px) {
    .app-layout.has-panel {
      display: flex;
      flex-direction: column;
    }
  }

  .site-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    text-align: center;
    border-top: 1px solid var(--color-muted-border);
  }
  .credit {
    font-size: 0.9rem;
    margin: 0;
  }
  .credit a {
    color: inherit;
    text-decoration: underline;
  }
</style>
