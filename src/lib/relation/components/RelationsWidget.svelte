<script lang="ts">
  // Sidebar list of everything linked to an entity, grouped by how the link
  // reads from this side. Relations are added through the CLI or MCP; MENTIONS
  // come from links in content, so they can't be removed here.
  import { invalidateAll } from '$app/navigation';
  import { trpc } from '$shared/trpc/client';
  import type { RelationGroup } from '$shared/types/relations';
  import { entityTypeLabel } from '$shared/utils/entity';
  import ConfirmButton from '$lib/ui/ConfirmButton.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { submitOrThrow } from '$lib/ui/submit';

  interface Props {
    readonly groups: readonly RelationGroup[];
  }

  const { groups }: Props = $props();

  const count = $derived(groups.reduce((n, group) => n + group.items.length, 0));

  const handleRemove = async (id: string) => {
    await submitOrThrow(() => trpc().relation.remove.mutate({ id }));
    await invalidateAll();
  };
</script>

<div class="relations-widget">
  <div class="section-header">
    <h4>Related <span class="count">{count}</span></h4>
  </div>
  {#if count === 0}
    <EmptyState message="Nothing linked yet." small />
  {:else}
    {#each groups as group (group.label)}
      <p class="eyebrow">{group.label}</p>
      <ul class="list">
        {#each group.items as item (item.id)}
          <li class="list-row">
            <a class="grow truncate" href={item.other.path}>{item.other.label}</a>
            <span class="meta truncate" title={item.note ?? undefined}>{item.note ?? entityTypeLabel(item.other.entityType)}</span>
            {#if item.kind !== 'MENTIONS'}
              <span class="row-actions">
                <ConfirmButton label="Remove link to {item.other.label}" variant="icon" onConfirm={() => handleRemove(item.id)} />
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
</div>

<style lang="scss">
  .eyebrow { margin: var(--sp-2) 0 var(--sp-1); }
  .meta { max-width: 45%; }
</style>
