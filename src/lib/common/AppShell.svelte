<script lang="ts">
  import { page } from '$app/stores';
  import RightPanel from '$lib/common/RightPanel.svelte';
  import { quickFinderOpen } from '$lib/stores/quick-finder';

  interface Props {
    readonly children: any;
    readonly showInfoPanel?: boolean;
    readonly collapseInfoPanelOnMedium?: boolean;
    readonly brandIconUrl?: string | null;
  }

  const { children, showInfoPanel = false, collapseInfoPanelOnMedium = false, brandIconUrl = null }: Props = $props();

  let menuOpen = $state(false);

  interface NavLink {
    readonly href: string;
    readonly label: string;
    readonly exact?: boolean;
  }

  const LINKS: readonly NavLink[] = [
    { href: '/app', label: 'Home', exact: true },
    { href: '/app/orgmap', label: 'Org Map' },
    { href: '/app/projects', label: 'Projects' },
    { href: '/app/reports', label: 'Reports' },
    { href: '/app/todos', label: 'Todos' },
  ];

  const isActive = (link: NavLink, pathname: string): boolean =>
    link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);

  const closeMenu = () => { menuOpen = false; };
</script>

<div class="app-layout" class:has-panel={showInfoPanel} class:collapse-medium={collapseInfoPanelOnMedium}>
  {#if showInfoPanel}
    <RightPanel />
  {/if}
  <div class="app-main">
    <nav class="topnav" aria-label="Main">
      <div class="nav-bar">
        <a href="/app" class="nav-brand" onclick={closeMenu}>
          {#if brandIconUrl}
            <img src={brandIconUrl} alt="" class="brand-icon" />
          {/if}
          <span>Working Notes</span>
        </a>
        <div class="nav-mobile-actions">
          <button type="button" class="btn icon" aria-label="Search" title="Search (⌘K)" onclick={() => quickFinderOpen.set(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="m13.5 13.5-3-3"/></svg>
          </button>
          <button type="button" class="btn icon hamburger" class:active={menuOpen} onclick={() => { menuOpen = !menuOpen; }} aria-label="Menu" aria-expanded={menuOpen}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <ul class="nav-links" class:open={menuOpen}>
        {#each LINKS as link (link.href)}
          <li>
            <a
              href={link.href}
              class="nav-link"
              aria-current={isActive(link, $page.url.pathname) ? 'page' : undefined}
              onclick={closeMenu}
            >{link.label}</a>
          </li>
        {/each}
        <li class="nav-end">
          <a href="/app/branding" class="nav-link secondary" aria-current={isActive({ href: '/app/branding', label: '' }, $page.url.pathname) ? 'page' : undefined} onclick={closeMenu}>Branding</a>
        </li>
        <li class="nav-search">
          <button type="button" class="btn ghost sm" onclick={() => quickFinderOpen.set(true)}>
            Search <kbd>⌘K</kbd>
          </button>
        </li>
      </ul>
    </nav>
    {#if menuOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="nav-scrim" onclick={closeMenu}></div>
    {/if}
    <main>
      {@render children()}
    </main>
    <footer class="site-footer">
      By <a href="https://jweatherby.dev" target="_blank" rel="noopener">jweatherby.dev</a>
    </footer>
  </div>
</div>

<style lang="scss">
  .topnav {
    position: relative;
    z-index: var(--z-nav);
    display: flex;
    align-items: center;
    gap: var(--sp-6);
    height: var(--nav-h);
    padding: 0 var(--sp-5);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .nav-bar {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .nav-brand {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    &:hover { text-decoration: none; }
  }
  .brand-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
    display: block;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    flex: 1;
    height: 100%;
    list-style: none;
    margin: 0;
    padding: 0;
    li { height: 100%; display: flex; align-items: center; }
    .nav-end { margin-left: auto; }
  }
  .nav-link {
    position: relative;
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 var(--sp-2);
    font-size: var(--fs-md);
    font-weight: 500;
    color: var(--text-2);
    transition: color var(--ease);
    &:hover { color: var(--text); text-decoration: none; }
    &[aria-current='page'] {
      color: var(--text);
      &::after {
        content: '';
        position: absolute;
        left: var(--sp-2);
        right: var(--sp-2);
        bottom: -1px;
        height: 2px;
        background: var(--accent);
        border-radius: 1px 1px 0 0;
      }
    }
    &.secondary { color: var(--text-3); &:hover { color: var(--text); } }
  }
  .nav-search kbd { margin-left: 2px; }
  .nav-mobile-actions { display: none; align-items: center; gap: var(--sp-1); }
  .hamburger {
    flex-direction: column;
    gap: 4px;
    span {
      display: block;
      width: 16px;
      height: 1.5px;
      background: currentColor;
      border-radius: 1px;
      transition: transform 200ms ease, opacity 200ms ease;
    }
    &.active span:nth-child(1) { transform: translateY(5.5px) rotate(45deg); }
    &.active span:nth-child(2) { opacity: 0; }
    &.active span:nth-child(3) { transform: translateY(-5.5px) rotate(-45deg); }
  }
  .nav-scrim { display: none; }

  @include below-md {
    .topnav { gap: 0; }
    .nav-bar { flex: 1; justify-content: space-between; }
    .nav-mobile-actions { display: flex; }
    .nav-links {
      display: none;
      flex-direction: column;
      align-items: stretch;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      height: auto;
      padding: var(--sp-2);
      gap: 0;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow-2);
      &.open { display: flex; }
      li { height: auto; display: block; }
      .nav-end { margin-left: 0; }
      .nav-search { display: none; }
    }
    .nav-link {
      height: 40px;
      padding: 0 var(--sp-3);
      border-radius: var(--r-md);
      font-size: var(--fs-base);
      &[aria-current='page'] { background: var(--surface-2); &::after { display: none; } }
    }
    .nav-scrim {
      display: block;
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-nav) - 1);
      background: var(--scrim);
    }
  }

  .app-layout {
    display: grid;
    // minmax(0, 1fr) so wide content scrolls inside the page instead of pushing the panel off-screen.
    grid-template-columns: minmax(0, 1fr);
    min-height: 100dvh;
    &.has-panel { grid-template-columns: minmax(0, 1fr) var(--panel-w); }
  }
  .app-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 100dvh;
  }
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  // Not a mixin: the notes panel only fits beside list pages from ~1150px, so it collapses in this band.
  @media (min-width: 768px) and (max-width: 1149px) {
    .app-layout.has-panel.collapse-medium {
      grid-template-columns: minmax(0, 1fr);
      :global(.right-panel .drawer-backdrop) { display: block; }
      :global(.right-panel .drawer-handle) { display: flex; }
      :global(.right-panel) {
        width: min(320px, 85vw);
        z-index: var(--z-drawer);
        box-shadow: var(--shadow-3);
        transform: translateX(100%);
        transition: transform 250ms ease;
      }
      :global(.right-panel.drawer-open) { transform: translateX(0); }
    }
  }

  @include below-md {
    .app-layout.has-panel {
      display: flex;
      flex-direction: column;
    }
  }

  .site-footer {
    padding: var(--sp-3) var(--sp-5);
    text-align: center;
    font-size: var(--fs-sm);
    color: var(--text-3);
    a { color: inherit; }
  }
</style>
