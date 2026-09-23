<script lang="ts">
  // The home page's focus graph: one entity in the middle and everything one
  // link away, grouped by how the link reads ("Reports to", "Depends on").
  // Clicking a neighbour moves it to the middle through `?focus=TYPE:id`, so
  // Back returns to the previous one. Docs, notes, todos and reports can't be
  // the middle, so they open instead.
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { trpc } from '$shared/trpc/client';
  import { loadEntityOptions, type EntityOption } from '$shared/trpc/load-entity-options';
  import type { FocusGraph, FocusNode } from '$shared/types/home';
  import type { RelatableType } from '$shared/types/enums';
  import { ENTITY_SEARCH_SCOPES, entityTypeLabel, typedIdValue } from '$shared/utils/entity';
  import SearchPicker from '$lib/ui/SearchPicker.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { errorMessage } from '$lib/ui/submit';
  import { focusHeight, layoutFocus } from '../focus-layout';

  interface Props {
    readonly graph: FocusGraph & { readonly focus: FocusNode };
  }

  const { graph }: Props = $props();

  const WIDTH = 1000;
  const MAX_CHARS = 24;
  const PILL_H = 26;

  /** Long names lose their middle, not their end: sibling projects often differ only at the end. */
  const truncate = (s: string): string => {
    if (s.length <= MAX_CHARS) return s;
    const tail = Math.floor((MAX_CHARS - 1) * 0.4);
    return `${s.slice(0, MAX_CHARS - 1 - tail).trimEnd()}…${s.slice(-tail).trimStart()}`;
  };
  /** Rough pill width for 11px text; the layout only needs it to centre the pill. */
  const pillWidth = (text: string, dot = true): number => Math.round(text.length * 6.3 + (dot ? 30 : 20));

  /** Colour groups: projects, people, goals, org units, and everything else. */
  const colourOf = (type: RelatableType): string => {
    switch (type) {
      case 'PROJECT': return 'project';
      case 'PERSON': return 'person';
      case 'GOAL': return 'goal';
      case 'TEAM':
      case 'DEPARTMENT': return 'org';
      default: return 'other';
    }
  };
  const COLOUR_LABEL: Record<string, string> = {
    project: 'Projects',
    person: 'People',
    goal: 'Goals',
    org: 'Teams and departments',
    other: 'Wiki and other'
  };

  const pillCount = $derived(graph.groups.reduce((n, g) => n + g.nodes.length + (g.more > 0 ? 1 : 0), 0));
  const height = $derived(focusHeight(pillCount));
  const layout = $derived(
    layoutFocus(graph.groups.map((g) => ({ size: g.nodes.length + (g.more > 0 ? 1 : 0) })), WIDTH, height)
  );
  const types = $derived([...new Set(graph.groups.flatMap((g) => g.nodes.map((n) => colourOf(n.type))))]);

  const centreText = $derived(truncate(graph.focus.label));
  const centreWidth = $derived(Math.round(centreText.length * 7.6 + 32));

  let hovered = $state<string | null>(null);
  let picking = $state(false);
  let options = $state<readonly EntityOption[]>([]);
  let loadingOptions = $state(false);
  let loadError = $state('');

  const focusHref = (n: FocusNode): string => {
    const url = new URL(page.url);
    url.searchParams.set('focus', typedIdValue(n.type, n.id));
    url.searchParams.delete('popup');
    return `${url.pathname}${url.search}`;
  };

  const openPicker = async () => {
    picking = true;
    if (options.length > 0) return;
    loadingOptions = true;
    try {
      options = await loadEntityOptions(trpc(), { entityType: graph.focus.type, entityId: graph.focus.id });
    } catch (e: unknown) {
      loadError = errorMessage(e);
    } finally {
      loadingOptions = false;
    }
  };

  const pick = async (id: string) => {
    picking = false;
    const url = new URL(page.url);
    url.searchParams.set('focus', id);
    await goto(`${url.pathname}${url.search}`, { noScroll: true, keepFocus: true });
  };
</script>

<section class="focus-section section" data-sveltekit-noscroll data-sveltekit-keepfocus>
  <header class="section-header">
    <h2>
      Around <a href={graph.focus.href}>{graph.focus.label}</a>
      <span class="muted text-sm">{entityTypeLabel(graph.focus.type)}</span>
    </h2>
    <div class="actions">
      {#if picking}
        <SearchPicker
          label="Focus on"
          {options}
          scopes={ENTITY_SEARCH_SCOPES}
          loading={loadingOptions}
          onPick={pick}
          onCancel={() => (picking = false)}
        />
        {#if loadError}<span class="inline-error" role="alert">{loadError}</span>{/if}
      {:else}
        <button type="button" class="btn sm" onclick={openPicker}>Change focus</button>
      {/if}
    </div>
  </header>

  <div class="scroll">
    <svg viewBox="0 0 {WIDTH} {height}" role="group" aria-label="Everything linked to {graph.focus.label}">
      <g class="edges">
        {#each graph.groups as group, gi (group.label)}
          {#each layout.nodes[gi] ?? [] as p, ni}
            {@const key = `${gi}:${ni}`}
            <line
              x1={layout.centre.x}
              y1={layout.centre.y}
              x2={p.x}
              y2={p.y}
              class:lit={hovered === key || hovered === `group:${gi}`}
              class:dim={hovered !== null && hovered !== key && hovered !== `group:${gi}`}
            />
          {/each}
        {/each}
      </g>

      <g class="labels">
        {#each graph.groups as group, gi (group.label)}
          {@const p = layout.labels[gi]}
          {#if p}
            <text
              class="group-label"
              class:lit={hovered?.startsWith(`${gi}:`) || hovered === `group:${gi}`}
              x={p.x}
              y={p.y}
              role="presentation"
              onpointerenter={() => (hovered = `group:${gi}`)}
              onpointerleave={() => (hovered = null)}
            >{group.label}</text>
          {/if}
        {/each}
      </g>

      <g class="nodes">
        {#each graph.groups as group, gi (group.label)}
          {#each group.nodes as n, ni (`${n.type}:${n.id}`)}
            {@const p = layout.nodes[gi]?.[ni]}
            {@const text = truncate(n.label)}
            {@const w = pillWidth(text)}
            {#if p}
              <a
                href={n.focusable ? focusHref(n) : n.href}
                class="pill"
                data-colour={colourOf(n.type)}
                class:dim={hovered !== null && hovered !== `${gi}:${ni}` && hovered !== `group:${gi}`}
                aria-label="{n.label} ({entityTypeLabel(n.type)}, {group.label.toLowerCase()})"
                onpointerenter={() => (hovered = `${gi}:${ni}`)}
                onpointerleave={() => (hovered = null)}
                onfocus={() => (hovered = `${gi}:${ni}`)}
                onblur={() => (hovered = null)}
              >
                <title>{n.label} · {entityTypeLabel(n.type)}{n.focusable ? '' : ' (opens)'}</title>
                <rect x={p.x - w / 2} y={p.y - PILL_H / 2} width={w} height={PILL_H} rx={PILL_H / 2} />
                <circle cx={p.x - w / 2 + 13} cy={p.y} r="4" />
                <text x={p.x - w / 2 + 23} y={p.y + 4}>{text}</text>
              </a>
            {/if}
          {/each}
          {#if group.more > 0}
            {@const p = layout.nodes[gi]?.[group.nodes.length]}
            {@const text = `+${group.more} more`}
            {@const w = pillWidth(text, false)}
            {#if p}
              <a
                href={graph.focus.href}
                class="pill more"
                class:dim={hovered !== null && hovered !== `group:${gi}`}
                aria-label="{group.more} more: open {graph.focus.label}"
              >
                <rect x={p.x - w / 2} y={p.y - PILL_H / 2} width={w} height={PILL_H} rx={PILL_H / 2} />
                <text x={p.x - w / 2 + 10} y={p.y + 4}>{text}</text>
              </a>
            {/if}
          {/if}
        {/each}

        <a href={graph.focus.href} class="pill centre" data-colour={colourOf(graph.focus.type)} aria-label="Open {graph.focus.label}">
          <title>Open {graph.focus.label}</title>
          <rect x={layout.centre.x - centreWidth / 2} y={layout.centre.y - 17} width={centreWidth} height="34" rx="17" />
          <text x={layout.centre.x} y={layout.centre.y + 5}>{centreText}</text>
        </a>
      </g>
    </svg>
  </div>

  {#if graph.groups.length === 0}
    <EmptyState message="Nothing is linked to {graph.focus.label} yet. Add links from its Related section." small />
  {:else}
    <div class="footer">
      <ul class="legend">
        {#each types as t (t)}
          <li data-colour={t}><span class="swatch"></span>{COLOUR_LABEL[t]}</li>
        {/each}
      </ul>
      <p class="text-sm muted">Click a neighbour to move it to the middle. Back returns.</p>
    </div>
  {/if}
</section>

<style lang="scss">
  .focus-section {
    [data-colour='project'] { --c: var(--viz-1); }
    [data-colour='person'] { --c: var(--viz-2); }
    [data-colour='goal'] { --c: var(--viz-3); }
    [data-colour='org'] { --c: var(--viz-4); }
    [data-colour='other'] { --c: var(--text-3); }
  }
  h2 {
    font-size: var(--fs-base);
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
    a { color: inherit; }
  }
  .actions {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
  }
  .scroll {
    overflow-x: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
  }
  svg {
    display: block;
    width: 100%;
    min-width: 640px;
    height: auto;
    user-select: none;
  }
  line {
    stroke: var(--text-3);
    stroke-opacity: 0.35;
    stroke-width: 1.2;
    transition: stroke-opacity 0.15s;
    &.lit { stroke: var(--accent); stroke-opacity: 1; }
    &.dim { stroke-opacity: 0.12; }
  }
  .group-label {
    font-size: var(--fs-xs);
    fill: var(--text-3);
    text-anchor: middle;
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 4px;
    stroke-linejoin: round;
    &.lit { fill: var(--accent); }
  }
  .pill {
    cursor: pointer;
    text-decoration: none;
    outline: none;
    transition: opacity 0.15s;
    rect {
      fill: var(--surface);
      stroke: var(--c, var(--border-strong));
      stroke-width: 1.5;
    }
    circle { fill: var(--c); }
    text {
      font-size: var(--fs-xs);
      fill: var(--text);
      pointer-events: none;
    }
    &:hover rect, &:focus-visible rect { stroke: var(--accent); stroke-width: 2; }
    &.dim { opacity: 0.35; }
    &.more {
      rect { stroke: var(--border-strong); stroke-dasharray: 3 3; }
      text { fill: var(--text-2); }
    }
    &.centre {
      rect { fill: var(--c); stroke: var(--surface); stroke-width: 3; }
      text {
        font-size: var(--fs-base);
        font-weight: 600;
        fill: var(--accent-text);
        text-anchor: middle;
      }
    }
  }
  .footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-2);
    margin-top: var(--sp-2);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-3);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--fs-xs);
    color: var(--text-2);
    li { display: inline-flex; align-items: center; gap: var(--sp-1); }
  }
  .swatch {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
  }
</style>
