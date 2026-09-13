<script lang="ts">
  import { goto } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import { quickFinderOpen } from '$lib/stores/quick-finder';
  import { openPopup } from '$lib/ui/popup-url';

  interface FinderItem {
    readonly label: string;
    readonly href?: string;
    readonly action?: () => void;
    readonly section: string;
    readonly indent?: boolean;
  }

  const CACHE_KEY = 'quick-finder-cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000;

  const STATIC_ROUTES: readonly FinderItem[] = [
    { label: 'Home', href: '/app', section: 'Pages' },
    { label: 'People', href: '/app/people', section: 'Pages' },
    { label: 'Teams', href: '/app/teams', section: 'Pages' },
    { label: 'Departments', href: '/app/departments', section: 'Pages' },
    { label: 'Projects', href: '/app/projects', section: 'Pages' },
    { label: 'Org Map', href: '/app/orgmap', section: 'Pages' },
    { label: 'Todos', href: '/app/todos', section: 'Pages' },
    { label: 'Reports', href: '/app/reports', section: 'Pages' },
    { label: 'Branding', href: '/app/branding', section: 'Pages' },
  ];

  const COMMANDS: readonly FinderItem[] = [
    {
      label: '/todos — New todo',
      section: 'Commands',
      action: () => { openPopup('todo'); }
    },
  ];

  let query = $state('');
  let selectedIndex = $state(0);
  let dynamicItems = $state<readonly FinderItem[]>([]);
  let loading = $state(false);
  let inputEl: HTMLInputElement | undefined = $state();

  const filtered = $derived.by(() => {
    const q = query.toLowerCase().trim();
    const isSlash = q.startsWith('/');

    if (isSlash) {
      const cmd = q;
      return COMMANDS.filter((c) => c.label.toLowerCase().includes(cmd));
    }

    const all = [...dynamicItems, ...STATIC_ROUTES];
    if (!q) return [...COMMANDS, ...all];
    return all.filter((item) => item.label.toLowerCase().includes(q));
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      quickFinderOpen.set(!$quickFinderOpen);
    }
  };

  // Reset and load whenever the finder opens, from the shortcut or the nav button.
  $effect(() => {
    if ($quickFinderOpen) {
      query = '';
      selectedIndex = 0;
      loadDynamic(false);
    }
  });

  const handleModalKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      quickFinderOpen.set(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter') {
      const item = filtered[selectedIndex];
      if (!item) return;
      e.preventDefault();
      select(item);
    }
  };

  const select = (item: FinderItem) => {
    quickFinderOpen.set(false);
    if (item.action) {
      item.action();
    } else if (item.href) {
      goto(item.href);
    }
  };

  interface CacheData {
    readonly ts: number;
    readonly projects: readonly { id: string; name: string; parentId: string | null }[];
  }

  const readCache = (): CacheData | null => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data: CacheData = JSON.parse(raw);
      if (Date.now() - data.ts > CACHE_TTL) return null;
      return data;
    } catch {
      return null;
    }
  };

  const writeCache = (data: Omit<CacheData, 'ts'>) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }));
    } catch { /* quota exceeded — ignore */ }
  };

  const buildDynamicItems = (cache: Omit<CacheData, 'ts'>): readonly FinderItem[] => {
    const parents = cache.projects.filter((p) => !p.parentId);
    const childrenByParent = new Map<string, { id: string; name: string; parentId: string | null }[]>();
    for (const p of cache.projects) {
      if (p.parentId) {
        const list = childrenByParent.get(p.parentId) ?? [];
        list.push(p);
        childrenByParent.set(p.parentId, list);
      }
    }
    const projectItems: FinderItem[] = [];
    for (const p of parents) {
      projectItems.push({ label: p.name, href: `/app/projects/${p.id}`, section: 'Projects' });
      for (const c of childrenByParent.get(p.id) ?? []) {
        projectItems.push({ label: c.name, href: `/app/projects/${c.id}`, section: 'Projects', indent: true });
      }
    }
    return [
      ...projectItems,
    ];
  };

  const loadDynamic = async (force: boolean) => {
    if (!force) {
      const cached = readCache();
      if (cached) {
        dynamicItems = buildDynamicItems(cached);
        return;
      }
    }
    loading = true;
    try {
      const client = trpc();
      const projectsResult = await client.project.list.query();
      const projects = projectsResult.ok ? projectsResult.value.map((p: { id: string; name: string; parentId: string | null }) => ({ id: p.id, name: p.name, parentId: p.parentId })) : [];
      writeCache({ projects });
      dynamicItems = buildDynamicItems({ projects });
    } catch {
      dynamicItems = [];
    } finally {
      loading = false;
    }
  };

  const handleRefresh = (e: MouseEvent) => {
    e.stopPropagation();
    loadDynamic(true);
  };

  $effect(() => {
    if ($quickFinderOpen && inputEl) {
      inputEl.focus();
    }
  });

  $effect(() => {
    // reset selection when filtered results change
    filtered;
    selectedIndex = 0;
  });

  let currentSection = $derived.by(() => {
    const sections: string[] = [];
    for (const item of filtered) {
      if (!sections.includes(item.section)) sections.push(item.section);
    }
    return sections;
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $quickFinderOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div class="backdrop" onclick={() => quickFinderOpen.set(false)} onkeydown={handleModalKeydown}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="finder" onclick={(e) => e.stopPropagation()}>
      <div class="finder-header">
        <input
          bind:this={inputEl}
          bind:value={query}
          type="text"
          placeholder="Search or type / for commands…"
          autocomplete="off"
          spellcheck="false"
        />
        <button type="button" class="btn icon sm" onclick={handleRefresh} title="Refresh data" aria-label="Refresh data" disabled={loading}>
          {#if loading}…{:else}↻{/if}
        </button>
      </div>
      <div class="results">
        {#each currentSection as section}
          <div class="section-label eyebrow">{section}</div>
          {#each filtered.filter((f) => f.section === section) as item, _i}
            {@const globalIndex = filtered.indexOf(item)}
            <button
              type="button"
              class="result-item"
              class:selected={globalIndex === selectedIndex}
              class:indented={item.indent}
              onmouseenter={() => (selectedIndex = globalIndex)}
              onclick={() => select(item)}
            >
              {item.label}
            </button>
          {/each}
        {/each}
        {#if filtered.length === 0}
          <div class="empty">No results</div>
        {/if}
      </div>
      <div class="finder-footer">
        <span><kbd>↑↓</kbd> navigate</span>
        <span><kbd>↵</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .backdrop {
    position: fixed;
    inset: 0;
    background: var(--scrim);
    backdrop-filter: blur(2px);
    z-index: var(--z-finder);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 15vh var(--sp-4) 0;
  }

  .finder {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    width: min(560px, 100%);
    max-height: 440px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-3);
    height: fit-content;
    animation: finder-in 140ms ease;
  }

  .finder-header {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-3);
    border-bottom: 1px solid var(--border);

    input {
      flex: 1;
      height: 36px;
      border: none;
      box-shadow: none;
      font-size: var(--fs-base);
      padding: 0;
      background: transparent;
      &:focus { box-shadow: none; }
    }
  }

  .results {
    overflow-y: auto;
    flex: 1;
    padding: var(--sp-1) 0;
  }

  .section-label {
    padding: var(--sp-2) var(--sp-3) var(--sp-1);
  }

  .result-item {
    display: block;
    width: 100%;
    height: var(--control-h);
    padding: 0 var(--sp-3);
    text-align: left;
    font-size: var(--fs-md);
    color: var(--text);
    &.selected { background: var(--surface-hover); }
    &.indented { padding-left: var(--sp-6); color: var(--text-2); }
    &:focus-visible { box-shadow: none; background: var(--surface-hover); }
  }

  .empty {
    padding: var(--sp-6);
    text-align: center;
  }

  .finder-footer {
    border-top: 1px solid var(--border);
    padding: var(--sp-2) var(--sp-3);
    display: flex;
    gap: var(--sp-4);
    font-size: var(--fs-xs);
    color: var(--text-3);
    span { display: inline-flex; align-items: center; gap: var(--sp-1); }
  }

  @keyframes finder-in {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
