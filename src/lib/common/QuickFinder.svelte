<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { trpc } from '$shared/trpc/client';
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
    { label: 'Reviews', href: '/app/reviews', section: 'Pages' },
    { label: 'Projects', href: '/app/projects', section: 'Pages' },
    { label: 'People', href: '/app/people', section: 'Pages' },
    { label: 'Teams', href: '/app/teams', section: 'Pages' },
    { label: 'Departments', href: '/app/departments', section: 'Pages' },
    { label: 'Todos', href: '/app/todos', section: 'Pages' },
    { label: 'Branding', href: '/app/branding', section: 'Pages' },
    { label: 'Account', href: '/app/account', section: 'Pages' },
  ];

  const COMMANDS: readonly FinderItem[] = [
    {
      label: '/todos — New todo',
      section: 'Commands',
      action: () => {
        const url = new URL($page.url);
        url.searchParams.set('popup', 'todo');
        goto(url.toString(), { replaceState: true, noScroll: true });
      }
    },
  ];

  let open = $state(false);
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
      open = !open;
      if (open) {
        query = '';
        selectedIndex = 0;
        loadDynamic(false);
      }
    }
  };

  const handleModalKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      open = false;
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
    open = false;
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
    if (open && inputEl) {
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

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="backdrop" onclick={() => (open = false)} onkeydown={handleModalKeydown}>
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
        <button class="refresh-btn" onclick={handleRefresh} title="Refresh data" disabled={loading}>
          {#if loading}…{:else}↻{/if}
        </button>
      </div>
      <div class="results">
        {#each currentSection as section}
          <div class="section-label">{section}</div>
          {#each filtered.filter((f) => f.section === section) as item, _i}
            {@const globalIndex = filtered.indexOf(item)}
            <button
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
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
    display: flex;
    justify-content: center;
    padding-top: 15vh;
  }

  .finder {
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-muted-border);
    border-radius: var(--radius, 8px);
    width: min(520px, 90vw);
    max-height: 420px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
    height: fit-content;
  }

  .finder-header {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--color-muted-border);
    padding: 0.5rem;
    gap: 0.5rem;

    input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 1rem;
      padding: 0.5rem;
      background: transparent;
      color: inherit;
    }
  }

  .refresh-btn {
    background: none;
    border: 1px solid var(--color-muted-border);
    border-radius: var(--radius, 4px);
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0.25rem 0.5rem;
    color: inherit;
    line-height: 1;

    &:hover:not(:disabled) {
      background: var(--color-muted-bg, #f0f0f0);
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }

  .results {
    overflow-y: auto;
    flex: 1;
    padding: 0.25rem 0;
  }

  .section-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted, #888);
    padding: 0.5rem 0.75rem 0.25rem;
    font-weight: 600;
  }

  .result-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: inherit;
    border-radius: 0;

    &.selected {
      background: var(--color-muted-bg, #f0f0f0);
    }

    &.indented {
      padding-left: 1.75rem;
    }
  }

  .empty {
    padding: 1.5rem;
    text-align: center;
    color: var(--color-muted, #888);
    font-size: 0.9rem;
  }

  .finder-footer {
    border-top: 1px solid var(--color-muted-border);
    padding: 0.4rem 0.75rem;
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--color-muted, #888);

    kbd {
      background: var(--color-muted-bg, #f0f0f0);
      border: 1px solid var(--color-muted-border);
      border-radius: 3px;
      padding: 0.1rem 0.3rem;
      font-size: 0.7rem;
      font-family: inherit;
    }
  }
</style>
