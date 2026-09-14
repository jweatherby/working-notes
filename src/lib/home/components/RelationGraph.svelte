<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    GRAPH_NODE_TYPES,
    type GraphEdgeKind,
    type GraphNodeType,
    type RelationGraph
  } from '$shared/types/home';
  import { layoutGraph, type Point } from '../graph-layout';
  import { features } from '$shared/settings/base/features';

  interface Props {
    readonly graph: RelationGraph;
  }

  const { graph }: Props = $props();

  const WIDTH = 1000;
  const HEIGHT = 560;
  const NODE_TYPES = GRAPH_NODE_TYPES.filter((t) => features.reports || t !== 'REPORT');

  const TYPE_LABEL: Record<GraphNodeType, string> = {
    PROJECT: 'Projects',
    DOC: 'Docs',
    REPORT: 'Reports',
    TODO: 'Todos'
  };
  const EDGE_LABEL: Record<GraphEdgeKind, string> = {
    SUBPROJECT: 'part of',
    DOC: 'doc',
    REPORT: 'report',
    TODO: 'todo'
  };

  let enabled = $state<Record<GraphNodeType, boolean>>({ PROJECT: true, DOC: true, REPORT: true, TODO: true });
  let hovered = $state<string | null>(null);
  let dragging = $state<{ id: string; moved: boolean } | null>(null);
  let svgEl = $state<SVGSVGElement | null>(null);

  const nodes = $derived(graph.nodes.filter((n) => enabled[n.type]));
  const edges = $derived.by(() => {
    const ids = new Set(nodes.map((n) => n.id));
    return graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  });

  // Manual drags override the computed layout until the visible set changes.
  let overrides = $state<Record<string, Point>>({});
  const computed = $derived(layoutGraph(nodes, edges, WIDTH, HEIGHT));
  const posOf = (id: string): Point => overrides[id] ?? computed.get(id) ?? { x: 0, y: 0 };

  const neighbours = $derived.by(() => {
    if (!hovered) return null;
    const set = new Set([hovered]);
    for (const e of edges) {
      if (e.source === hovered) set.add(e.target);
      if (e.target === hovered) set.add(e.source);
    }
    return set;
  });

  const toSvgPoint = (evt: PointerEvent): Point => {
    const rect = svgEl!.getBoundingClientRect();
    return {
      x: Math.min(WIDTH, Math.max(0, ((evt.clientX - rect.left) / rect.width) * WIDTH)),
      y: Math.min(HEIGHT, Math.max(0, ((evt.clientY - rect.top) / rect.height) * HEIGHT))
    };
  };

  const onPointerDown = (evt: PointerEvent, id: string) => {
    (evt.currentTarget as Element).setPointerCapture(evt.pointerId);
    dragging = { id, moved: false };
  };
  const onPointerMove = (evt: PointerEvent) => {
    if (!dragging) return;
    dragging.moved = true;
    overrides = { ...overrides, [dragging.id]: toSvgPoint(evt) };
  };
  const onPointerUp = (href: string) => {
    const wasClick = dragging && !dragging.moved;
    dragging = null;
    if (wasClick) goto(href);
  };

  const toggle = (t: GraphNodeType) => {
    enabled = { ...enabled, [t]: !enabled[t] };
    overrides = {};
  };

  const radius = (type: GraphNodeType): number => (type === 'PROJECT' ? 14 : 7);
</script>

<section class="graph-section section">
  <header class="section-header">
    <h2>Relations</h2>
    <div class="legend">
      {#each NODE_TYPES as t}
        <button type="button" class="chip" class:off={!enabled[t]} data-type={t} onclick={() => toggle(t)}>
          <span class="swatch"></span>{TYPE_LABEL[t]}
        </button>
      {/each}
    </div>
  </header>

  <div class="scroll">
      <svg bind:this={svgEl} viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label="Relation graph">
        <g class="edges">
          {#each edges as e (`${e.source}-${e.target}-${e.kind}`)}
            {@const a = posOf(e.source)}
            {@const b = posOf(e.target)}
            {@const lit = neighbours ? neighbours.has(e.source) && neighbours.has(e.target) && (e.source === hovered || e.target === hovered) : false}
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} data-kind={e.kind} class:lit class:dim={neighbours && !lit} />
            {#if lit}
              <text class="edge-label" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4}>{EDGE_LABEL[e.kind]}</text>
            {/if}
          {/each}
        </g>
        <g class="nodes">
          {#each nodes as n (n.id)}
            {@const p = posOf(n.id)}
            <g
              class="node"
              data-type={n.type}
              class:dim={neighbours && !neighbours.has(n.id)}
              transform="translate({p.x} {p.y})"
              role="link"
              tabindex="0"
              aria-label={n.label}
              onpointerenter={() => (hovered = n.id)}
              onpointerleave={() => (hovered = null)}
              onpointerdown={(evt) => onPointerDown(evt, n.id)}
              onpointermove={onPointerMove}
              onpointerup={() => onPointerUp(n.href)}
              onkeydown={(evt) => evt.key === 'Enter' && goto(n.href)}
            >
              {#if n.type === 'PROJECT' || n.type === 'TODO'}
                <circle r={radius(n.type)} />
              {:else}
                <rect x={-radius(n.type)} y={-radius(n.type)} width={radius(n.type) * 2} height={radius(n.type) * 2} rx="2" />
              {/if}
              <text y={radius(n.type) + 13}>{n.label}</text>
            </g>
          {/each}
        </g>
      </svg>
    </div>
    <p class="hint text-sm muted">Hover to see connections, click to open, drag to rearrange.</p>
</section>

<style lang="scss">
  .graph-section {
    --node-project: var(--viz-1);
    --node-doc: var(--viz-2);
    --node-report: var(--viz-3);
    --node-todo: var(--viz-4);
  }
  h2 { font-size: var(--fs-base); }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 22px;
    padding: 0 8px;
    font-size: var(--fs-xs);
    color: var(--text-2);
    border: 1px solid var(--border);
    border-radius: var(--r-full);
    background: var(--surface);
    transition: opacity var(--ease);
    &:hover { border-color: var(--border-strong); }
    &.off { opacity: 0.4; }
  }
  .swatch {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
  }
  [data-type='PROJECT'] { --c: var(--node-project); }
  [data-type='DOC'] { --c: var(--node-doc); }
  [data-type='REPORT'] { --c: var(--node-report); }
  [data-type='TODO'] { --c: var(--node-todo); }

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
    touch-action: none;
    user-select: none;
  }
  line {
    stroke: var(--text-3);
    stroke-opacity: 0.45;
    stroke-width: 1.2;
    transition: stroke-opacity 0.15s;
    &[data-kind='SUBPROJECT'] { stroke-dasharray: 4 3; }
    &.lit { stroke: var(--accent); stroke-opacity: 1; }
    &.dim { stroke-opacity: 0.1; }
  }
  .edge-label {
    font-size: 11px;
    fill: var(--accent);
    text-anchor: middle;
    pointer-events: none;
  }
  .node {
    cursor: pointer;
    transition: opacity 0.15s;
    outline: none;
    circle, rect {
      fill: var(--c);
      stroke: var(--surface);
      stroke-width: 2;
    }
    text {
      font-size: 11px;
      fill: var(--text-2);
      text-anchor: middle;
      pointer-events: none;
    }
    &:hover circle, &:hover rect, &:focus-visible circle, &:focus-visible rect {
      stroke: var(--accent);
    }
    &.dim { opacity: 0.2; }
  }
  .hint { margin-top: var(--sp-2); }
</style>
