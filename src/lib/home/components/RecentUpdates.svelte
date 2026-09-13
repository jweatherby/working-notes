<script lang="ts">
  import type { RecentUpdate, UpdateKind } from '$shared/types/home';
  import { timeAgo } from '../utils';

  interface Props {
    readonly updates: readonly RecentUpdate[];
  }

  const { updates }: Props = $props();

  const kindLabel = (k: UpdateKind): string => k.charAt(0) + k.slice(1).toLowerCase();
</script>

<section class="panel">
  <header><h2>Latest updates</h2></header>

  {#if updates.length === 0}
    <p class="empty">No activity yet.</p>
  {:else}
    <ul class="updates">
      {#each updates as u (`${u.kind}:${u.id}`)}
        <li>
          <span class="kind" data-kind={u.kind}>{kindLabel(u.kind)}</span>
          <div class="body">
            <a href={u.href} class="title">{u.title}</a>
            <div class="meta">
              <span>{u.isNew ? 'added' : 'updated'}</span>
              {#if u.parentLabel}<span>on {u.parentLabel}</span>{/if}
              <time datetime={new Date(u.at).toISOString()}>{timeAgo(u.at)}</time>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style lang="scss">
  header {
    margin-bottom: 0.5rem;
  }
  h2 {
    font-size: 1.1rem;
    margin: 0;
  }
  .updates {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--color-muted-border);
    font-size: 0.9rem;
    &:last-child {
      border-bottom: none;
    }
  }
  .kind {
    flex-shrink: 0;
    width: 5.5rem;
    margin-top: 0.15rem;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }
  .body {
    min-width: 0;
    flex: 1;
  }
  .title {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
  .meta {
    display: flex;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: var(--color-muted);
    time {
      margin-left: auto;
      white-space: nowrap;
    }
  }
  .empty {
    color: var(--color-muted);
    font-size: 0.85rem;
  }
</style>
