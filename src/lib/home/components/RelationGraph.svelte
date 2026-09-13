<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    GRAPH_NODE_TYPES,
    type GraphEdgeKind,
    type GraphNodeType,
    type RelationGraph
  } from '$shared/types/home';
  import { layoutGraph, type Point } from '../graph-layout';

  interface Props {
    readonly graph: RelationGraph;
  }

  const { graph }: Props = $props();

  const WIDTH = 1000;
  const HEIGHT = 560;

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

<section class="graph-section">
  <header>
    <h2>Relations</h2>
    <div class="legend">
      {#each GRAPH_NODE_TYPES as t}
        <button type="button" data-plain class="chip" class:off={!enabled[t]} data-type={t} onclick={() => toggle(t)}>
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
    <p class="hint">Hover to see connections, click to open, drag to rearrange.</p>
</section>

<style lang="scss">
  .graph-section {
    --node-project: var(--indigo-6, #4f46e5);
    --node-doc: var(--teal-6, #0d9488);
    --node-report: var(--pink-6, #db2777);
    --node-todo: var(--orange-6, #ea580c);
    margin-top: 2rem;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  h2 {
    font-size: 1.1rem;
    margin: 0;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .chip {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.78rem;
    padding: 0.15rem 0.55rem;
    border: 1px solid var(--color-muted-border);
    border-radius: 999px;
    &.off {
      opacity: 0.4;
    }
  }
  .swatch {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: var(--c);
  }
  [data-type='PROJECT'] { --c: var(--node-project); }
  [data-type='DOC'] { --c: var(--node-doc); }
  [data-type='REPORT'] { --c: var(--node-report); }
  [data-type='TODO'] { --c: var(--node-todo); }

  .scroll {
    overflow-x: auto;
    border: 1px solid var(--color-muted-border);
    border-radius: var(--radius, 8px);
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
    stroke: var(--color-muted);
    stroke-opacity: 0.45;
    stroke-width: 1.2;
    transition: stroke-opacity 0.15s;
    &[data-kind='SUBPROJECT'] { stroke-dasharray: 4 3; }
    &.lit { stroke: var(--color-primary); stroke-opacity: 1; }
    &.dim { stroke-opacity: 0.1; }
  }
  .edge-label {
    font-size: 11px;
    fill: var(--color-primary);
    text-anchor: middle;
    pointer-events: none;
  }
  .node {
    cursor: pointer;
    transition: opacity 0.15s;
    outline: none;
    circle, rect {
      fill: var(--c);
      stroke: var(--color-bg, #fff);
      stroke-width: 2;
    }
    text {
      font-size: 11px;
      fill: currentColor;
      text-anchor: middle;
      pointer-events: none;
    }
    &:hover circle, &:hover rect, &:focus-visible circle, &:focus-visible rect {
      stroke: var(--color-primary);
    }
    &.dim { opacity: 0.2; }
  }
  .hint {
    color: var(--color-muted);
    font-size: 0.8rem;
    margin-top: 0.4rem;
  }
</style>
